#!/bin/bash

YARN_BIN="$HOME/.yarn/bin"
LINK_DIR="$HOME/.config/yarn/link/poker-cli/dist"

yarn unlink --silent

chmod +x dist/mail.js

yarn link --silent

ln -sf $LINK_DIR/main.js $YARN_BIN/poker-cli/
