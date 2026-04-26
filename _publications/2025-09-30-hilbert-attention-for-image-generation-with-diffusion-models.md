---
title: "Hilbert Attention for Image Generation with Diffusion Models"
collection: publications
category: manuscripts
permalink: /publication/2025-09-30-hilbert-attention-for-image-generation-with-diffusion-models
excerpt: "Proposed HilbertA, a sparse attention mechanism based on the Hilbert curve that jointly preserves 2D spatial locality and enables contiguous memory access, improving sparsity efficiency and memory throughput. Designed Hilbert-curve sparse attention with reordering, tiling, and sliding strategies to support local modeling and global information flow while maintaining coalesced GPU memory access and preserving image locality. Developed custom sparse attention kernel fusion in Triton and integrated LoRA fine-tuning to maximize information flow and computational efficiency. Achieved up to 4.17× speedup on Flux.1 with comparable image quality, demonstrating a superior speed–quality trade-off over dense and 2D sparse baselines."
date: 2025-09-30
venue: "arXiv preprint"
authors: "Shaoyi Zheng, Wenbo Lu, Yuxuan Xia, Haomin Liu, Shengjie Wang"
tags: [efficient-ai]
---
Hilbert Attention (HilbertA) introduces a sparse attention mechanism for diffusion models using the Hilbert curve to ensure 2D spatial locality and contiguous memory access. The method reorders tokens along the Hilbert curve, applies tiling and sliding windows to balance local modeling and global information flow, and preserves coalesced GPU memory access for improved throughput. A custom Triton kernel fuses the sparse attention operations, and LoRA fine-tuning maximizes information flow under sparsity. Experiments show up to 4.17× speedup on Flux.1 with comparable image quality, offering a superior speed–quality trade toff relative to dense and 2D sparse attention baselines.
