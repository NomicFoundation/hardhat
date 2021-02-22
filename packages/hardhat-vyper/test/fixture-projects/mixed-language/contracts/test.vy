deployer: public(address)
addr: public(address)
num: public(wei_value)

@public
def __init__(_addr: address, _num: wei_value):
    self.addr = _addr
    self.num = _num
    self.deployer = msg.sender

@public
def increase():
  self.num = self.num + 2
