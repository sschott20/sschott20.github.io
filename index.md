---
layout: default
title: Alex (Sebastian) Schott
---

<div class="header">
  <img class="headshot" src="{{ '/assets/headshot.jpg' | relative_url }}" alt="Alex Schott">
  <div class="header-text">
    <h1>Alex (Sebastian) Schott</h1>
    <p class="subtitle">Computer Science PhD student, Yale University.</p>
  </div>
</div>

<p class="links">
  <a href="https://github.com/sschott20">GitHub</a>
  <a href="mailto:a.schott@yale.edu">Email</a>
  <a href="https://www.linkedin.com/in/sebastian-schott/">Linkedin</a>
  <a href="https://scholar.google.com/citations?user=EbaHnkQAAAAJ&amp;hl=en&amp;oi=sra">Scholar</a>
  <a href="{{ '/trees/' | relative_url }}">Trees</a>
</p>

## About

I am a Computer Science PhD student at Yale, advised by Prof. Lin Zhong in the [Yale Efficient Computing Lab](https://yecl.org/). My research sits at the intersection of large language models, robotics, and systems. I am interested in how reinforcement learning and structured memory can make LLM-based agents capable, efficient, and reliable enough to control real robots.

Before starting my PhD, I completed a B.S. in Mathematics and Computer Science at Yale (2021 to 2025). I worked with the same lab on Hopter, a Rust operating system for embedded devices, and earlier with Prof. Jay Lim on correctly rounded floating-point math libraries.

## Preprints

<ul class="projects">
  <li>
    <a class="name" href="https://arxiv.org/abs/2607.05482">TypeGo: An OS Runtime for Embodied Agents</a>.
    <span class="desc">Structuring LLM-based planning as an OS-style runtime so embodied agents can act in real time on concurrent goals.</span>
    <span class="meta">Guojun Chen, <span class="me">Alex Schott</span>, Lin Zhong. arXiv:2607.05482, July 2026.</span>
  </li>
</ul>

## Publications

<ul class="projects">
  <li>
    <a class="name" href="https://doi.org/10.1136/tobaccocontrol-2021-057243">Understanding e-cigarette content and promotion on YouTube through machine learning</a>.
    <span class="desc">Using machine learning to characterize e-cigarette video content, featured products, uploaders, and marketing on YouTube.</span>
    <span class="meta">Grace Kong, <span class="me">Alex Sebastian Schott</span>, Juhan Lee, Hassan Dashtian, Dhiraj Murthy. Tobacco Control 32(6), 2023.</span>
  </li>
</ul>

## Projects

<h3>LLMs &amp; Robotics</h3>

<ul class="projects">
  <li>
    <a class="name" href="https://github.com/sschott20/typemem">typemem</a>.
    <span class="desc">An abstract memory framework for LLM-controlled robots: typed, composable memory primitives for planning agents.</span>
  </li>
  <li>
    <a class="name" href="https://arxiv.org/abs/2607.05482">TypeGo</a>.
    <span class="desc">A multi-layer LLM planning system for the Unitree Go2 quadruped, combining high-level natural-language reasoning with low-level learned control. Now a preprint on arXiv.</span>
  </li>
  <li>
    <a class="name" href="https://github.com/sschott20/go2_sim2real">go2_sim2real</a>.
    <span class="desc">Deploying simulation-trained locomotion policies on the Unitree Go2 quadruped.</span>
  </li>
</ul>

<h3>LLM Systems</h3>

<ul class="projects">
  <li>
    <a class="name" href="https://github.com/sschott20/pie-openclaw-bench">pie-openclaw-bench</a>.
    <span class="desc">Benchmark infrastructure for modular KV caching on LLM serving workloads using PIE.</span>
  </li>
</ul>

<h3>Systems &amp; Compilers</h3>

<ul class="projects">
  <li>
    <a class="name" href="https://github.com/sschott20/hopter">hopter</a>.
    <span class="desc">Extends the Hopter embedded Rust OS by offloading stack unwinding, allowing recovery from fatal errors with no runtime cost.</span>
  </li>
  <li>
    <a class="name" href="https://github.com/sschott20/ALibm">ALibm</a>.
    <span class="desc">Generates correctly rounded polynomial approximations for elementary functions in 16 and 32 bit floating point using a modified Remez algorithm.</span>
  </li>
</ul>

<footer>
  Last updated July 2026. Built with Jekyll. <a href="https://github.com/sschott20">Source on GitHub</a>.
</footer>
