import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Any

class NatureCNNBackbone(nn.Module):
    """
    Standard DeepMind Atari-style CNN for processing (4, 84, 84) stacked frames.
    Includes feature hook mechanisms for live frontend activation visualization.
    """
    def __init__(self, in_channels: int = 4, feature_dim: int = 512):
        super(NatureCNNBackbone, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, 32, kernel_size=8, stride=4)
        self.relu1 = nn.ReLU()
        self.conv2 = nn.Conv2d(32, 64, kernel_size=4, stride=2)
        self.relu2 = nn.ReLU()
        self.conv3 = nn.Conv2d(64, 64, kernel_size=3, stride=1)
        self.relu3 = nn.ReLU()

        # Calculate flattened dimension:
        # 84x84 -> Conv1 (8, stride 4) -> 20x20
        # 20x20 -> Conv2 (4, stride 2) -> 9x9
        # 9x9 -> Conv3 (3, stride 1) -> 7x7
        # 64 * 7 * 7 = 3136
        self.fc = nn.Linear(64 * 7 * 7, feature_dim)
        self.relu_fc = nn.ReLU()

        # Cached activations for visualization
        self.latest_conv1_act = None
        self.latest_conv3_act = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        c1 = self.relu1(self.conv1(x))
        c2 = self.relu2(self.conv2(c1))
        c3 = self.relu3(self.conv3(c2))

        # Cache feature activations for visualization
        if not self.training:
            self.latest_conv1_act = c1.detach()
            self.latest_conv3_act = c3.detach()

        flat = c3.view(c3.size(0), -1)
        features = self.relu_fc(self.fc(flat))
        return features

    def get_latest_activation_map(self) -> list:
        """
        Returns average spatial activation map from Conv3 normalized to 0-255
        as a nested 2D list for JSON transmission to the frontend.
        """
        if self.latest_conv3_act is None:
            return [[0]*7 for _ in range(7)]

        # Average across the 64 channels: shape (7, 7)
        act = self.latest_conv3_act[0].mean(dim=0).cpu().numpy()
        min_v, max_v = act.min(), act.max()
        if max_v - min_v > 1e-5:
            norm_act = ((act - min_v) / (max_v - min_v) * 255.0).astype(int)
        else:
            norm_act = np.zeros_like(act, dtype=int)
        return norm_act.tolist()
