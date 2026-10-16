"""Tests for explicit MSD modality name mapping."""
import unittest

from backend.main import _canonical_msd_modality


class TestMSDModalityMapping(unittest.TestCase):
    def test_supported_dataset_json_names(self):
        expected = {
            "T1": "t1",
            "T1w": "t1",
            "T1gd": "t1gd",
            "T1ce": "t1gd",
            "T2": "t2",
            "T2w": "t2",
            "FLAIR": "flair",
        }
        for source, canonical in expected.items():
            with self.subTest(source=source):
                self.assertEqual(_canonical_msd_modality(source), canonical)

    def test_unknown_modality_is_rejected_by_empty_mapping(self):
        self.assertEqual(_canonical_msd_modality("ADC"), "")


if __name__ == "__main__":
    unittest.main()
