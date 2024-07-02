# pragma version ~=0.4.0

IMMUTABLE_1: public(immutable(String[4]))

@deploy
@payable
def __init__():
    IMMUTABLE_1 = "B"
