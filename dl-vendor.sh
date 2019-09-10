#!/bin/bash

(
  mkdir -p vendor/
  cd vendor/
  wget "https://unpkg.com/preact" -O preact.js
  wget "https://unpkg.com/htm" -O htm.js
  wget "https://unpkg.com/mobx" -O mobx.js
  wget "https://unpkg.com/mobx-preact" -O mobx-preact.js

  (
    wget "https://unpkg.com/typeface-open-sans" -O typeface-open-sans.css
    mkdir -p files/
    cd files/
    wget "https://unpkg.com/typeface-open-sans/files/open-sans-latin-300.woff"{,2}
  )
)
