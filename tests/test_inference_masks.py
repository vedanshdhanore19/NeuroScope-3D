"""Unit tests for segmentation label mapping; run with python -m unittest discover -s tests."""
import unittest

import numpy as np

from backend.app.inference import convert_nested_masks_to_brats_codes


class TestBratsLabelMapping(unittest.TestCase):
    def test_nested_regions_map_to_expected_labels(self):
        wt = np.array([[[True, True, True, False]]])
        tc = np.array([[[True, True, False, True]]])
        et = np.array([[[True, False, True, True]]])

        labels = convert_nested_masks_to_brats_codes(tc, wt, et)

        # Match MONAI bundle precedence: ET overrides TC, which overrides WT.
        np.testing.assert_array_equal(labels, np.array([[[4, 1, 4, 4]]], dtype=np.int16))
        self.assertTrue(set(np.unique(labels)).issubset({0, 1, 2, 4}))

    def test_all_empty_masks_produce_background(self):
        empty = np.zeros((2, 3, 4), dtype=bool)
        labels = convert_nested_masks_to_brats_codes(empty, empty, empty)
        self.assertEqual(int(np.count_nonzero(labels)), 0)
        self.assertEqual(labels.dtype, np.int16)

    def test_non_nested_masks_follow_monai_channel_precedence(self):
        wt = np.array([False, True, True])
        tc = np.array([True, True, False])
        et = np.array([True, True, True])

        labels = convert_nested_masks_to_brats_codes(tc, wt, et)

        np.testing.assert_array_equal(labels, np.array([4, 4, 4], dtype=np.int16))


if __name__ == "__main__":
    unittest.main()
