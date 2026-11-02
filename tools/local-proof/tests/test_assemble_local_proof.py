import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('assembler', Path(__file__).parents[1] / 'scripts/assemble_local_proof.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


class AssemblyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.temp.name)
        for name, color, size, rate in [('red', 'red', '320x180', 24), ('blue', 'blue', '180x320', 30)]:
            m.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', f'color=c={color}:s={size}:r={rate}:d=2',
                   '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(cls.root / f'{name}.mp4')])
        m.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.5', str(cls.root/'tone.wav')])
        cls.base = {'schemaVersion': 1, 'kind': 'synthetic-test', 'output': {'width': 180, 'height': 320, 'fps': 24},
                    'clips': [{'id': name, 'accepted': True, 'storyPurpose': 'SYNTHETIC TEST ONLY',
                               'file': {'path': name+'.mp4', 'sha256': m.sha(cls.root/(name+'.mp4'))},
                               'sourceOffsetSeconds': 0.5, 'durationSeconds': 1} for name in ('red', 'blue')]}

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def write(self, data=None):
        path = self.root / 'manifest.json'
        path.write_text(json.dumps(data or self.base), encoding='utf-8')
        return path

    def reject(self, data):
        with self.assertRaises(m.InvalidManifest):
            m.validate(self.write(data), True)

    def test_validate_fixture(self):
        self.assertEqual(len(m.validate(self.write(), True)[1]), 2)

    def test_fixture_requires_flag(self):
        with self.assertRaises(m.InvalidManifest):
            m.validate(self.write(), False)

    def test_rejected_take(self):
        d=copy.deepcopy(self.base); d['clips'][0]['accepted']=False; self.reject(d)

    def test_changed_pixels(self):
        d=copy.deepcopy(self.base); d['clips'][0]['file']['sha256']='0'*64; self.reject(d)

    def test_external_url(self):
        d=copy.deepcopy(self.base); d['clips'][0]['file']['path']='https://example.com/clip.mp4'; self.reject(d)

    def test_escape_path(self):
        d=copy.deepcopy(self.base); d['clips'][0]['file']['path']='../clip.mp4'; self.reject(d)

    def test_bad_duration(self):
        for duration in (float('nan'), -1, 3, .123):
            d=copy.deepcopy(self.base); d['clips'][0]['durationSeconds']=duration; self.reject(d)

    def test_duplicate_ids(self):
        d=copy.deepcopy(self.base); d['clips'][1]['id']='red'; self.reject(d)

    def test_missing_real_approval(self):
        d=copy.deepcopy(self.base); d['kind']='local-generated-proof'
        with self.assertRaises(m.InvalidManifest):
            m.validate(self.write(d),False)

    def test_real_cannot_use_fixture_bypass(self):
        d=copy.deepcopy(self.base); d['kind']='local-generated-proof'; self.reject(d)

    def test_soundtrack_needs_rights(self):
        d=copy.deepcopy(self.base); d['soundtrack']={'file': {'path':'tone.wav','sha256':m.sha(self.root/'tone.wav')}}
        self.reject(d)

    def test_frame_exact_export_and_repeat_denial(self):
        out=self.root/'silent.mp4'
        result=m.assemble(self.write(),out,True)
        self.assertEqual((result['frames'],result['durationSeconds']),(48,2))
        receipt=json.loads(out.with_suffix('.receipt.json').read_text())
        self.assertFalse(receipt['aiGenerated'])
        self.assertEqual(result['sha256'],m.sha(out))
        self.assertFalse(any(s['codec_type']=='audio' for s in m.probe(out)['streams']))
        # Check a central pixel from each half: verifies cuts/order, not just frame count.
        for time, channel in [('0.25',0),('1.25',2)]:
            import subprocess
            data=subprocess.check_output(['ffmpeg','-v','error','-ss',time,'-i',str(out),'-frames:v','1',
                                          '-vf','crop=2:2:90:160,format=rgb24','-f','rawvideo','-'])
            self.assertGreater(data[channel],180)
        with self.assertRaises(m.InvalidManifest):
            m.assemble(self.write(),out,True)

    def test_explicit_soundtrack_padding(self):
        d=copy.deepcopy(self.base)
        d['soundtrack']={'file':{'path':'tone.wav','sha256':m.sha(self.root/'tone.wav')},'rightsEvidence':'Generated sine test only'}
        out=self.root/'with-audio.mp4'
        m.assemble(self.write(d),out,True)
        a=next(s for s in m.probe(out)['streams'] if s['codec_type']=='audio')
        self.assertAlmostEqual(float(a['duration']),2,delta=.05)


if __name__=='__main__':
    unittest.main()
