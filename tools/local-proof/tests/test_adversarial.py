"""Regression tests for the independent review findings."""
import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import test_assemble_local_proof as original
m = original.m

class ReviewAdversarial(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        original.AssemblyTests.setUpClass()
        cls.root = original.AssemblyTests.root
        cls.base = original.AssemblyTests.base

    @classmethod
    def tearDownClass(cls):
        original.AssemblyTests.tearDownClass()

    def test_indirect_media_is_rejected(self):
        nested = self.root / 'nested'; nested.mkdir()
        (nested / 'linked.mp4').symlink_to(self.root / 'red.mp4')
        playlist = nested / 'take.ffconcat'
        playlist.write_text("ffconcat version 1.0\nfile 'linked.mp4'\nduration 2\n")
        d = copy.deepcopy(self.base); d['clips'] = d['clips'][:1]
        d['clips'][0]['file'] = {'path':'take.ffconcat','sha256':m.sha(playlist)}
        manifest = nested / 'manifest.json'; manifest.write_text(json.dumps(d))
        # Indirect media formats are rejected before decoding their external references.
        with self.assertRaises(RuntimeError):
            m.validate(manifest, True)

    def test_changed_source_after_validation_is_rejected(self):
        d = copy.deepcopy(self.base); d['clips'] = d['clips'][:1]
        source = self.root / 'mutable.mp4'; source.write_bytes((self.root/'red.mp4').read_bytes())
        d['clips'][0]['file'] = {'path':'mutable.mp4','sha256':m.sha(source)}
        manifest = self.root/'race.json'; manifest.write_text(json.dumps(d))
        original_validate = m.validate
        def mutate(*args):
            result = original_validate(*args)
            source.write_bytes((self.root/'blue.mp4').read_bytes())
            return result
        out = self.root/'race.mp4'
        with patch.object(m, 'validate', side_effect=mutate):
            with self.assertRaises(m.InvalidManifest):
                m.assemble(manifest, out, True)
        self.assertFalse(out.exists())

    def test_manifest_receipt_uses_immutable_snapshot(self):
        d = copy.deepcopy(self.base); d['clips'] = d['clips'][:1]
        manifest = self.root/'manifest-race.json'; manifest.write_text(json.dumps(d))
        original_validate = m.validate
        def mutate(*args):
            result = original_validate(*args)
            manifest.write_text('{}')
            return result
        out = self.root/'manifest-race.mp4'
        with patch.object(m, 'validate', side_effect=mutate):
            m.assemble(manifest, out, True)
        receipt = json.loads(out.with_suffix('.receipt.json').read_text())
        import hashlib
        self.assertEqual(receipt['inputManifestSha256'], hashlib.sha256(json.dumps(d).encode()).hexdigest())
        self.assertNotEqual(receipt['inputManifestSha256'], m.sha(manifest))
        self.assertNotEqual(receipt['inputManifest'], json.loads(manifest.read_text()))

if __name__ == '__main__':
    unittest.main()
