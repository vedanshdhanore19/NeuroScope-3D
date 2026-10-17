"""Model-outline confidence helpers. These values are not disease probabilities."""
from typing import Dict
import numpy as np


def region_confidence(probability: np.ndarray, predicted_mask: np.ndarray, shell_mask: np.ndarray | None = None) -> Dict[str, float | str]:
    """Summarize sigmoid probabilities over the predicted region and a small uncertainty shell."""
    probability = np.asarray(probability, dtype=np.float32)
    predicted_mask = np.asarray(predicted_mask, dtype=bool)
    if shell_mask is None:
        shell_mask = predicted_mask
    else:
        shell_mask = np.asarray(shell_mask, dtype=bool) | predicted_mask
    values = probability[predicted_mask]
    shell_values = probability[shell_mask]
    if values.size == 0:
        return {"mean_probability": 0.0, "high_confidence_fraction": 0.0, "uncertain_fraction": 0.0, "level": "Low"}
    mean_probability = float(values.mean())
    high = float(np.mean(values >= 0.9))
    uncertain = float(np.mean((shell_values > 0.3) & (shell_values < 0.7))) if shell_values.size else 0.0
    level = "High" if mean_probability >= 0.90 else "Moderate" if mean_probability >= 0.75 else "Low"
    return {"mean_probability": mean_probability, "high_confidence_fraction": high, "uncertain_fraction": uncertain, "level": level}


def summarize_confidence(probabilities: np.ndarray, labels: np.ndarray) -> Dict[str, Dict[str, float | str]]:
    """Return WT/TC/ET outline confidence from a [3,X,Y,Z] sigmoid output."""
    probs = np.asarray(probabilities)
    labels = np.asarray(labels)
    masks = {"WT": np.isin(labels, [1, 2, 4]), "TC": np.isin(labels, [1, 4]), "ET": labels == 4}
    return {name: region_confidence(probs[i], mask) for i, (name, mask) in enumerate(masks.items())}
