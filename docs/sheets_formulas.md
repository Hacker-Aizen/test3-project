# Google Sheets formulas — Diagnostic logic

These formulas are intended to be used in a Google Sheet that Zapier will write the Typeform submission into, then compute `EstimatedLossPerMonth` and `HealthScore`.

Assume the sheet columns (A..H):
A: Timestamp
B: Name
C: Phone
D: Email
E: Appliance (ac/fridge/washer)
F: YearOfPurchase
G: UsageHoursPerDay
H: MonthsSinceLastService

Add computational columns:
I: BaseKWh (formula based on appliance)
J: Age
K: UsageFactor
L: AgeFactor
M: ServiceFactor
N: InefficiencyKwh
O: EstimatedLossINR
P: HealthScore

Example formulas (row 2):

I2 (BaseKWh):
=IF(E2="ac",120,IF(E2="fridge",60,IF(E2="washer",30,50)))

J2 (Age):
=IF(ISNUMBER(F2),YEAR(TODAY())-F2,2)

K2 (UsageFactor):
=MIN(3,MAX(0.5, G2/4))

L2 (AgeFactor):
=1 + (J2 * 0.05)

M2 (ServiceFactor):
=1 + (H2 / 24)

N2 (InefficiencyKwh):
=I2 * L2 * K2 * M2

O2 (EstimatedLossINR):
=MAX(50,ROUND((N2 - I2) * 8))

P2 (HealthScore):
=MAX(6,MIN(100,ROUND(100 - (O2/200)*100)))

Notes:
- ₹ rate is assumed at ₹8/kWh — tune for your region.
- Health score scales inversely with loss. Adjust normalization constants to taste.
- Zapier should wait a short moment for sheets to compute before reading the computed cells (use the 'Delay' or 'Find row' actions).

