import re

f = "frontend/app/admin/page.tsx"
with open(f, "r") as file:
    content = file.read()

content = content.replace(">= 60", ">= 75")
content = content.replace(">= 80", ">= 90")
content = content.replace("≥60%", "≥75%")
content = content.replace("&lt;60%", "&lt;75%")
content = content.replace("pct >= 60", "pct >= 75")

with open(f, "w") as file:
    file.write(content)

f2 = "frontend/components/CandidateFlow.tsx"
with open(f2, "r") as file:
    content = file.read()

content = content.replace(">= 60", ">= 75")
content = content.replace(">= 80", ">= 90")

with open(f2, "w") as file:
    file.write(content)

print("Replaced successfully")
