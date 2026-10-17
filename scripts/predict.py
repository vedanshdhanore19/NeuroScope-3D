#!/usr/bin/env python3
"""One-shot NeuroScope prediction CLI."""
import argparse
from pathlib import Path
import nibabel as nib

from backend.app.inference import run_inference
from backend.app.volumetrics import compute_volumes, evaluate_against_expert_mask
from backend.app.validator import validate_expert_mask


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--t1', required=True); p.add_argument('--t1gd', required=True); p.add_argument('--t2', required=True); p.add_argument('--flair', required=True)
    p.add_argument('--out', required=True); p.add_argument('--expert')
    args = p.parse_args()
    files = {k: getattr(args, k) for k in ('t1', 't1gd', 't2', 'flair')}
    try:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        labels, elapsed = run_inference(files, args.out)
        ref = nib.load(args.t1); spacing = ref.header.get_zooms()[:3]
        volumes = compute_volumes(labels, ref.affine, spacing)
        print(f'inference_seconds={elapsed:.2f}')
        for region, value in volumes.items(): print(f'{region}: {value["volume_ml"]:.3f} mL ({value["voxel_count"]} voxels)')
        if args.expert:
            expert = validate_expert_mask(args.expert, ref)
            metrics = evaluate_against_expert_mask(labels, expert, spacing=spacing)
            for region, value in metrics.items(): print(f'{region}: Dice={value["dice_score"]:.4f} Sensitivity={value["sensitivity"]:.4f} HD95={value["hd95_mm"]}')
        return 0
    except Exception as exc:
        print(f'ERROR: {exc}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
