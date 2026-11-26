object "Echo" {
  code {
    datacopy(0, dataoffset("runtime"), datasize("runtime"))
    return(0, datasize("runtime"))
  }
  object "runtime" {
    code {
      calldatacopy(0, 0, calldatasize())
      return(0, calldatasize())
    }
  }
}
