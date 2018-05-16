let emojiEnabled = false;

function enableEmoji() {
  emojiEnabled = true;
}

function emoji(msgIfEnabled, msgIfDisabled = "") {
  return emojiEnabled ? msgIfEnabled : msgIfDisabled;
}

module.exports = { enableEmoji, emoji };
