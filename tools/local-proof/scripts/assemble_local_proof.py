#!/usr/bin/env python3
"""Offline accepted-take assembly; never generates, downloads or approves media."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from fractions import Fraction

MEDIA_FORMATS = 'mov,matroska,webm,wav,mp3,flac,ogg'


class InvalidManifest(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise InvalidManifest(message)


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def number(value, label, low, high):
    require(type(value) in (int, float) and math.isfinite(value) and low <= value <= high,
            f'{label} must be a finite number in [{low}, {high}]')
    return value


def text(value, label):
    require(isinstance(value, str) and bool(value.strip()), f'{label} is required')
    return value


def local_file(root, ref, label):
    require(isinstance(ref, dict), f'{label} needs path and sha256')
    relative = text(ref.get('path'), f'{label}.path')
    require(not Path(relative).is_absolute() and not re.match(r'^[a-zA-Z]:', relative)
            and '://' not in relative, f'{label} must use a relative local path')
    path = (root / relative).resolve()
    require(path.is_relative_to(root) and path.is_file(), f'{label} missing or outside manifest folder')
    expected = ref.get('sha256')
    require(isinstance(expected, str) and re.fullmatch('[0-9a-f]{64}', expected), f'{label} needs SHA-256')
    require(sha(path) == expected, f'{label} checksum mismatch')
    return path


def run(args):
    result = subprocess.run(args, check=False, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(f'{Path(args[0]).name} failed: {result.stderr[-2000:]}')
    return result.stdout


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-protocol_whitelist', 'file,pipe',
                           '-format_whitelist', MEDIA_FORMATS,
                           '-show_streams', '-show_format', '-of', 'json', str(path)]))


def approval(value, label):
    require(isinstance(value, dict), f'{label} is required')
    require(value.get('approved') is True, f'{label} is not approved')
    text(value.get('evidence'), f'{label}.evidence')


def validate(manifest_path, fixture_mode=False, manifest_bytes=None):
    root = manifest_path.resolve().parent
    data = json.loads(manifest_bytes if manifest_bytes is not None else manifest_path.read_bytes())
    require(data.get('schemaVersion') == 1, 'Unsupported schemaVersion')
    kind = data.get('kind')
    require(kind in ('local-generated-proof', 'synthetic-test'), 'Unknown kind')
    require((kind == 'synthetic-test') == fixture_mode,
            'Synthetic tests require --fixture; real proofs must not use --fixture')
    output = data.get('output', {})
    width = number(output.get('width'), 'output.width', 64, 4096)
    height = number(output.get('height'), 'output.height', 64, 4096)
    fps = number(output.get('fps'), 'output.fps', 1, 60)
    require(all(type(v) is int for v in (width, height, fps)) and width % 2 == height % 2 == 0,
            'Dimensions must be even integers; fps must be an integer')
    clips = data.get('clips')
    require(isinstance(clips, list) and 1 <= len(clips) <= 20, 'Supply 1–20 clips in edit order')
    resolved = []
    ids = set()
    for index, clip in enumerate(clips):
        label = f'clips[{index}]'
        require(isinstance(clip, dict), f'{label} must be an object')
        clip_id = text(clip.get('id'), label + '.id')
        require(clip_id not in ids, 'Clip IDs must be unique')
        ids.add(clip_id)
        require(clip.get('accepted') is True, f'{label} is not accepted')
        text(clip.get('storyPurpose'), label + '.storyPurpose')
        path = local_file(root, clip.get('file'), label + '.file')
        metadata = probe(path)
        videos = [s for s in metadata['streams'] if s['codec_type'] == 'video']
        require(len(videos) == 1, f'{label} must contain exactly one video stream')
        video = videos[0]
        start = number(clip.get('sourceOffsetSeconds', 0), label + '.sourceOffsetSeconds', 0, 3600)
        duration = number(clip.get('durationSeconds'), label + '.durationSeconds', 1 / fps, 60)
        frames = round(duration * fps)
        require(abs(frames / fps - duration) < 0.00001, f'{label} trim must align to output frames')
        source_duration = float(video.get('duration', metadata['format']['duration']))
        require(start + duration <= source_duration + 0.001, f'{label} trim exceeds source; no stretching allowed')
        if not fixture_mode:
            approval(clip.get('keyframeApproval'), label + '.keyframeApproval')
            approval(clip.get('motionApproval'), label + '.motionApproval')
            local_file(root, clip.get('sourceImage'), label + '.sourceImage')
            local_file(root, clip.get('workflow'), label + '.workflow')
            generation = clip.get('generation', {})
            require(generation.get('provider') == 'local-comfyui', 'This proof contract accepts local-comfyui only')
            text(generation.get('comfyuiVersion'), label + '.comfyuiVersion')
            require(type(generation.get('seed')) is int and generation['seed'] >= 0, 'Record integer seed')
            text(generation.get('prompt'), label + '.prompt')
            models = generation.get('models')
            require(isinstance(models, list) and bool(models), 'Record model identities')
            for model in models:
                text(model.get('filename'), 'model.filename')
                require(isinstance(model.get('sha256'), str) and re.fullmatch('[0-9a-f]{64}', model['sha256']),
                        'Record actual model SHA-256')
            for field in ('steps', 'width', 'height', 'frames', 'fps'):
                number(generation.get(field), 'generation.' + field, 1, 16384)
            number(generation.get('renderSeconds'), 'generation.renderSeconds', 0, 604800)
            text(generation.get('qualityReview'), 'generation.qualityReview')
        resolved.append({'path': path, 'start': start, 'frames': frames, 'probe': metadata})
    audio = None
    if data.get('soundtrack') is not None:
        audio = local_file(root, data['soundtrack'].get('file'), 'soundtrack.file')
        require(any(s['codec_type'] == 'audio' for s in probe(audio)['streams']), 'Soundtrack has no audio')
        text(data['soundtrack'].get('rightsEvidence'), 'soundtrack.rightsEvidence')
    return data, resolved, audio


def assemble(manifest_path, destination, fixture_mode=False, validate_only=False):
    for binary in ('ffmpeg', 'ffprobe'):
        require(shutil.which(binary) is not None, f'{binary} must already be installed')
    manifest_bytes = manifest_path.read_bytes()
    manifest_hash = hashlib.sha256(manifest_bytes).hexdigest()
    data, clips, audio = validate(manifest_path, fixture_mode, manifest_bytes)
    if validate_only:
        return {'valid': True, 'kind': data['kind'], 'clips': len(clips)}
    destination = destination.resolve()
    receipt_path = destination.with_suffix('.receipt.json')
    require(destination.suffix.lower() == '.mp4', 'Output must be .mp4')
    require(not destination.exists() and not receipt_path.exists(), 'Refusing to overwrite output or receipt')
    destination.parent.mkdir(parents=True, exist_ok=True)
    fps = data['output']['fps']
    width, height = data['output']['width'], data['output']['height']
    total_frames = sum(c['frames'] for c in clips)
    total_duration = total_frames / fps
    with tempfile.TemporaryDirectory(prefix='crayvo-proof-', dir=destination.parent) as directory:
        temp = Path(directory)
        # Stage/hash the exact accepted bytes. Concurrent edits fail before encoding;
        # later edits to originals cannot change the staged render inputs.
        def stage(path, expected, name):
            target = temp / name
            shutil.copyfile(path, target)
            require(sha(target) == expected, f'Input changed before staging: {path.name}')
            return target
        for index, clip in enumerate(clips):
            clip['path'] = stage(clip['path'], data['clips'][index]['file']['sha256'], f'input-{index}.media')
            staged_metadata = probe(clip['path'])
            staged_videos = [s for s in staged_metadata['streams'] if s['codec_type'] == 'video']
            require(len(staged_videos) == 1, 'Staged take must have exactly one video stream')
            staged_duration = float(staged_videos[0].get('duration', staged_metadata['format']['duration']))
            require(clip['start'] + clip['frames'] / fps <= staged_duration + .001,
                    'Staged take is shorter than approved trim')
            if not fixture_mode:
                for field in ('sourceImage', 'workflow'):
                    ref = data['clips'][index][field]
                    path = local_file(manifest_path.resolve().parent, ref, field)
                    stage(path, ref['sha256'], f'{field}-{index}.bin')
        if audio:
            audio = stage(audio, data['soundtrack']['file']['sha256'], 'soundtrack.media')
            require(any(s['codec_type'] == 'audio' for s in probe(audio)['streams']), 'Staged soundtrack has no audio')
        for index, clip in enumerate(clips):
            # Strip source audio explicitly. Normalize aspect, timestamps, frame rate, SAR and codec.
            vf = (f'scale={width}:{height}:force_original_aspect_ratio=decrease,'
                  f'pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,'
                  f'fps={fps},setpts=PTS-STARTPTS,format=yuv420p')
            run(['ffmpeg', '-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe',
                 '-format_whitelist', MEDIA_FORMATS,
                 '-ss', str(clip['start']), '-i', str(clip['path']), '-map', '0:v:0', '-an',
                 '-vf', vf, '-frames:v', str(clip['frames']), '-c:v', 'libx264', '-crf', '18',
                 '-preset', 'medium', '-r', str(fps), '-fps_mode', 'cfr',
                 '-video_track_timescale', str(fps * 1000), '-map_metadata', '-1', str(temp / f'{index}.mp4')])
        listing = temp / 'cuts.txt'
        listing.write_text(''.join(f"file '{i}.mp4'\n" for i in range(len(clips))), encoding='utf-8')
        joined = temp / 'joined.mp4'
        run(['ffmpeg', '-v', 'error', '-nostdin', '-f', 'concat', '-safe', '1', '-i', str(listing),
             '-c', 'copy', '-map_metadata', '-1', str(joined)])
        final = temp / 'final.mp4'
        args = ['ffmpeg', '-v', 'error', '-nostdin', '-i', str(joined)]
        if audio:
            args += ['-protocol_whitelist', 'file,pipe', '-format_whitelist', MEDIA_FORMATS,
                     '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0',
                     '-af', f'apad,atrim=duration={total_duration},afade=t=out:st={max(0,total_duration-.25)}:d=0.25',
                     '-c:a', 'aac', '-b:a', '192k']
        else:
            args += ['-an']
        args += ['-c:v', 'copy', '-map_metadata', '-1', '-movflags', '+faststart', str(final)]
        run(args)
        metadata = probe(final)
        video = next(s for s in metadata['streams'] if s['codec_type'] == 'video')
        require(int(video.get('nb_frames', -1)) == total_frames, 'Encoded frame count differs from approved edit')
        require(abs(float(video['duration']) - total_duration) <= 1 / fps, 'Encoded duration differs')
        require((video['width'], video['height']) == (width, height), 'Encoded dimensions differ')
        require(Fraction(video['avg_frame_rate']) == fps, 'Encoded frame rate differs')
        audio_streams = [s for s in metadata['streams'] if s['codec_type'] == 'audio']
        require(len(audio_streams) == (1 if audio else 0), 'Encoded audio stream count differs')
        if audio:
            require(abs(float(audio_streams[0]['duration']) - total_duration) <= .05, 'Encoded soundtrack duration differs')
        receipt = {'schemaVersion': 1, 'kind': data['kind'], 'aiGenerated': False if fixture_mode else None,
                   'generationOrigin': 'synthetic' if fixture_mode else 'user-attested-local-comfyui',
                   'claim': 'Synthetic assembly test, not generated character animation' if fixture_mode else
                            'Assembly of user-attested accepted local takes; visual quality requires human review',
                   'inputManifestSha256': manifest_hash, 'inputManifest': data,
                   'output': {'filename': destination.name, 'sha256': sha(final), 'frames': total_frames,
                              'durationSeconds': total_duration, 'width': width, 'height': height,
                              'fps': fps, 'audio': 'supplied soundtrack' if audio else 'silent'},
                   'tools': {'ffmpeg': run(['ffmpeg', '-version']).splitlines()[0]},
                   'sourceAudio': 'removed; only explicit soundtrack retained',
                   'appIntegration': 'Not uploaded or approved in the Crayvo app'}
        # Exclusive file creation avoids silently overwriting a concurrent output.
        with destination.open('xb') as target, final.open('rb') as source:
            shutil.copyfileobj(source, target)
        with receipt_path.open('x', encoding='utf-8') as target:
            json.dump(receipt, target, indent=2)
            target.write('\n')
    return receipt['output']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--fixture', action='store_true', help='Explicitly label synthetic test media')
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(assemble(args.manifest, args.output, args.fixture, args.validate_only), indent=2))
    except (InvalidManifest, RuntimeError, ValueError, OSError, KeyError, TypeError) as error:
        parser.exit(1, f'Blocked: {error}\n')


if __name__ == '__main__':
    main()
