let emojiEnabled = false;

export function enableEmoji() {
  emojiEnabled = true;
}

export function emoji(msgIfEnabled, msgIfDisabled = "") {
  return emojiEnabled ? msgIfEnabled : msgIfDisabled;
}
