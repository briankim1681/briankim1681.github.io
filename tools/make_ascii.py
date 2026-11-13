import math
W,H=64,21
ramp={1:":",2:"=",3:"*",4:"#"}
rows=[]
for y in range(H):
    r=""
    for x in range(W):
        bx,by=x//4,y//2
        d=math.hypot(bx-7.5,(by-4.75)*1.7)
        h=max(0,4-int(d/1.9))
        if h==0:
            c="." if (x%6==0 and y%3==0) else " "
        elif y%2==0: c="+" if x%4==0 else "-"
        elif x%4==0: c="|"
        else: c=ramp[h]
        r+=c
    rows.append(r.rstrip())
open("roblox.txt","w").write("\n".join(rows))
W,H=58,14
heights=[(math.sin(i*0.45)+math.sin(i*0.17+1)+2.2)/4.4*H for i in range(W//2)]
rows=[]
for y in range(H,0,-1):
    r=""
    for h in heights:
        r+= "# " if h>=y else (". " if h>y-1 else "  ")
    rows.append(r.rstrip())
rows.append("-"*(W-1))
open("nsdc.txt","w").write("\n".join(rows))
