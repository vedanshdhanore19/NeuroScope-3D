#!/usr/bin/env python3
"""Evaluate labelled NeuroScope cases without inventing unavailable results."""
import argparse, json
from pathlib import Path


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True); p.add_argument('--split', required=True)
    p.add_argument('--out-dir', default='docs')
    args = p.parse_args()
    data = Path(args.data); split = Path(args.split); out = Path(args.out_dir); out.mkdir(parents=True, exist_ok=True)
    split_data = json.loads(split.read_text())
    cases = split_data.get('test', split_data.get('cases', [])) if isinstance(split_data, dict) else split_data
    # The harness intentionally refuses to manufacture metrics. Wiring a model/data adapter here
    # should happen when labelled cases are actually available in the supplied directory.
    result = {
        'status': 'not yet run',
        'reason': 'No model/data adapter was executed by this scaffold; metrics must come from labelled cases.',
        'patient_level_split': cases,
        'metrics': {},
        'disclosure': 'The MONAI brats_mri_segmentation bundle was trained on BraTS 2018; BraTS 2021/MSD cases may overlap its training data.'
    }
    (out / 'evaluation_results.json').write_text(json.dumps(result, indent=2))
    (out / 'EVALUATION.md').write_text('# NeuroScope-3D Evaluation\n\nStatus: **not yet run**.\n\nNo evaluation numbers are invented. Run the harness with a labelled dataset and a model/data adapter. The MONAI brats_mri_segmentation bundle was trained on BraTS 2018; BraTS 2021/MSD cases may overlap its training data.\n')
    print(f'Wrote {out / "EVALUATION.md"} and {out / "evaluation_results.json"}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
