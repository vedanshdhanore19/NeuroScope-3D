"""Regression tests: 'size of tensor a (38) must match tensor b (37)' must never come back."""
import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("monai")
from backend.app.inference import ShapeSafeModel, _pad_and_predict, _channel_order


class MiniUNet(torch.nn.Module):
    """Mimics SegResNet shape behaviour: 3 stride-2 convs down, x2 upsample + skip-add up."""

    def __init__(self):
        super().__init__()
        self.c0 = torch.nn.Conv3d(4, 4, 3, padding=1)
        self.d = torch.nn.ModuleList(torch.nn.Conv3d(4, 4, 3, stride=2, padding=1) for _ in range(3))
        self.up = torch.nn.Upsample(scale_factor=2, mode="trilinear", align_corners=False)
        self.head = torch.nn.Conv3d(4, 3, 1)

    def forward(self, x):
        skips = [self.c0(x)]
        for conv in self.d:
            skips.append(conv(skips[-1]))
        y = skips[-1]
        for skip in reversed(skips[:-1]):
            y = self.up(y) + skip
        return self.head(y)


def test_unwrapped_model_reproduces_original_bug():
    with pytest.raises(RuntimeError, match="must match the size of tensor"):
        MiniUNet().eval()(torch.ones(1, 4, 40, 40, 147))


@pytest.mark.parametrize("shape", [(24, 24, 147), (24, 24, 155), (16, 16, 160), (33, 47, 59), (75, 91, 73)])
def test_shape_safe_model_handles_any_size(shape):
    with torch.no_grad():
        out = ShapeSafeModel(MiniUNet().eval())(torch.ones(1, 4, *shape))
    assert tuple(out.shape[2:]) == shape


@pytest.mark.parametrize("shape", [(48, 48, 39), (50, 61, 37), (64, 64, 64), (33, 47, 59)])
def test_pad_and_predict_preserves_original_shape(shape, monkeypatch):
    monkeypatch.setenv("NEUROSCOPE_ROI", "32,32,32")
    out = _pad_and_predict(torch.randn(1, 4, *shape), MiniUNet().eval(), torch.device("cpu"))
    assert tuple(out.shape) == (1, 3, *shape)
    assert torch.isfinite(out).all()


def test_default_channel_order_matches_bundle_metadata():
    # configs/metadata.json channel_def: 0=T1c, 1=T1, 2=T2, 3=FLAIR
    assert _channel_order() == ("t1gd", "t1", "t2", "flair")
