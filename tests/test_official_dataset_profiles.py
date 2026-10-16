"""Tests for explicit dataset-profile label handling."""
import unittest
import numpy as np

from backend.app.validator import ValidationError, normalize_expert_labels


class TestOfficialDatasetLabelProfiles(unittest.TestCase):
    def test_brats2021_labels_remain_canonical(self):
        labels = np.array([0, 1, 2, 4], dtype=np.int16)
        np.testing.assert_array_equal(
            normalize_expert_labels(labels, "brats2021"),
            np.array([0, 1, 2, 4], dtype=np.int16),
        )

    def test_msd_task01_labels_are_mapped_to_brats_convention(self):
        # MSD Task01: 1=edema, 2=non-enhancing/core, 3=enhancing tumor.
        labels = np.array([0, 1, 2, 3], dtype=np.int16)
        np.testing.assert_array_equal(
            normalize_expert_labels(labels, "msd_task01"),
            np.array([0, 2, 1, 4], dtype=np.int16),
        )

    def test_wrong_profile_labels_are_rejected(self):
        with self.assertRaises(ValidationError):
            normalize_expert_labels(np.array([0, 1, 2, 3]), "brats2021")

    def test_unknown_profile_is_rejected(self):
        with self.assertRaises(ValidationError):
            normalize_expert_labels(np.array([0, 1]), "unknown")

    def test_non_integer_mask_values_are_rejected(self):
        with self.assertRaises(ValidationError):
            normalize_expert_labels(np.array([0.0, 1.5]), "brats2021")


if __name__ == "__main__":
    unittest.main()
