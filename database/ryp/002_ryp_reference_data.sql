-- RYP reference/status definitions.
-- Apply to the approved shared list_of_value table after confirming its real schema.

-- Payment lifecycle used by the proposed database:
-- R = Ready / payable
-- P = Pending gateway confirmation
-- W = Waiting for finance verification
-- S = Success
-- F = Failed
-- E = Expired
-- C = Cancelled by user/system
-- X = Cancelled by company
-- D = Deleted/cancelled legacy value

-- Widget filter values required by the current RYP widget/API specification:
-- RYP_ALL
-- RYP_DUE
-- RYP_GRACE_PERIOD
-- RYP_NEAR_END_GRACE
-- RYP_OVER_GRACE
-- RYP_VERIFY_PAYMENT
-- RYP_AUTO_DEBIT_FAIL

-- Payment types:
-- 01 = QR Code BAY (QR_BAY)
-- 02 = Credit Card KBank (CC_KBANK)
-- 03 = Direct Debit (DD)
