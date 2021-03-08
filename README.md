# Flipboard

This bit of JS builds a grid of SVG elements that displays and transitions between a series of images. The transition style was inspired by those old-time-y 'split-flap' displays you'd get at train stations. Here's how it looks.

![Flipboard demo](https://raw.githubusercontent.com/egargan/flipboard/main/readme-demo.gif)

There are a few things I'd like to keep working on with this project:

* FPS gets pretty choppy at the mid-point of the transition. Looking at dev tools' performance monitor, it seems I'm asking too much of CSS animations, but this surprises me as there isn't that much going on!

* `script.js` is pretty monolithic, it needs to be broken down into modules.

* `TransitionComposer` could be a bit more feature-rich, at the moment it only supports one transition style.

* Packaging it up and providing a clean interface for adding this to an existing site.
