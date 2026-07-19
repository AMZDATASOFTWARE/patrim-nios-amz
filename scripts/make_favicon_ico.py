from PIL import Image, ImageDraw

SCALE = 8
S = 64 * SCALE

def scaled(*vals):
    return tuple(v * SCALE for v in vals)

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

DARK = (4, 11, 21, 255)          # #040B15 (mesma cor de fundo da Landing)
CYAN = (34, 211, 238, 255)       # #22D3EE (mesma cor --landing-cyan)
CYAN_BORDER = (34, 211, 238, 115)

draw.rounded_rectangle(scaled(0, 0, 64, 64), radius=14 * SCALE, fill=DARK)
draw.rounded_rectangle(scaled(3, 3, 61, 61), radius=12 * SCALE, outline=CYAN_BORDER, width=2 * SCALE)
draw.rounded_rectangle(scaled(20, 14, 44, 50), radius=2 * SCALE, fill=CYAN)

window_coords = [(25, 20), (35, 20), (25, 29), (35, 29), (25, 38), (35, 38)]
for x, y in window_coords:
    draw.rectangle(scaled(x, y, x + 4, y + 4), fill=DARK)

draw.rectangle(scaled(28, 44, 36, 50), fill=DARK)

sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save("public/favicon.ico", format="ICO", sizes=sizes)
print("done")
