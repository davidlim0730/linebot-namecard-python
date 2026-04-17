from PIL import Image, ImageDraw, ImageFont
import os

width = 2500
height = 843
bg_color = "#1E1E1E"
accent_color = "#06C755"
text_main = "#FFFFFF"
text_sub = "#A0A0A0"
line_color = "#333333"
row_mid = 421  # divider between row1 and row2

image = Image.new("RGB", (width, height), bg_color)
draw = ImageDraw.Draw(image)

# Grid separators
draw.line([(833, 80), (833, height - 80)], fill=line_color, width=3)
draw.line([(1666, 80), (1666, height - 80)], fill=line_color, width=3)
draw.line([(80, row_mid), (width - 80, row_mid)], fill=line_color, width=3)

FONT_CANDIDATES = [
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
]
font_main = font_sub = None
for path in FONT_CANDIDATES:
    try:
        font_main = ImageFont.truetype(path, 68)
        font_sub  = ImageFont.truetype(path, 40)
        break
    except IOError:
        continue
if font_main is None:
    font_main = ImageFont.load_default()
    font_sub  = ImageFont.load_default()


def draw_text_center(d, text, font, fill, x, y):
    if hasattr(font, "getbbox"):
        bb = font.getbbox(text)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
    else:
        tw, th = 100, 20
    d.text((x - tw / 2, y - th / 2), text, font=font, fill=fill)


def cell_center(col, row):
    col_w = [833, 833, 834]
    col_x = [0, 833, 1666]
    row_h = [421, 422]
    row_y = [0, 421]
    cx = col_x[col] + col_w[col] / 2
    cy = row_y[row] + row_h[row] / 2
    return cx, cy


# ── Row 1 ──────────────────────────────────────────────────────────────────

# [0,0] 回報拜訪 — chat bubble icon
cx, cy = cell_center(0, 0)
ix, iy = cx, cy - 60
draw.rounded_rectangle([ix-110, iy-70, ix+110, iy+70], radius=20, outline=accent_color, width=10)
draw.ellipse([ix-60, iy-10, ix-20, iy+30], fill=accent_color)
draw.ellipse([ix-10, iy-10, ix+30, iy+30], fill=accent_color)
draw.ellipse([ix+40, iy-10, ix+80, iy+30], fill=accent_color)
draw.polygon([ix-30, iy+65, ix-70, iy+100, ix+10, iy+65], fill=accent_color)
draw_text_center(draw, "回報拜訪", font_main, text_main, cx, cy + 80)
draw_text_center(draw, "記錄互動・新增案件", font_sub, text_sub, cx, cy + 155)

# [1,0] 我的案件 — briefcase icon
cx, cy = cell_center(1, 0)
ix, iy = cx, cy - 60
draw.rounded_rectangle([ix-120, iy-60, ix+120, iy+80], radius=18, outline=accent_color, width=10)
draw.rounded_rectangle([ix-60, iy-85, ix+60, iy-55], radius=10, outline=accent_color, width=10)
draw.line([ix-120, iy-10, ix+120, iy-10], fill=accent_color, width=8)
draw_text_center(draw, "我的案件", font_main, text_main, cx, cy + 80)
draw_text_center(draw, "Pipeline・追蹤進度", font_sub, text_sub, cx, cy + 155)

# [2,0] 我的待辦 — checklist icon
cx, cy = cell_center(2, 0)
ix, iy = cx, cy - 60
for i, checked in enumerate([True, True, False]):
    y = iy - 50 + i * 55
    draw.rounded_rectangle([ix-110, y-18, ix+110, y+18], radius=10, outline=accent_color, width=8)
    if checked:
        draw.line([ix-85, y, ix-65, y+20], fill=accent_color, width=8)
        draw.line([ix-65, y+20, ix-35, y-15], fill=accent_color, width=8)
draw_text_center(draw, "我的待辦", font_main, text_main, cx, cy + 80)
draw_text_center(draw, "今日・本週・全部", font_sub, text_sub, cx, cy + 155)

# ── Row 2 ──────────────────────────────────────────────────────────────────

# [0,1] 名片管理 — namecard icon
cx, cy = cell_center(0, 1)
ix, iy = cx, cy - 55
draw.rounded_rectangle([ix-120, iy-75, ix+120, iy+75], radius=20, outline=accent_color, width=10)
draw.line([ix-80, iy-20, ix+80, iy-20], fill=accent_color, width=8)
draw.line([ix-80, iy+25, ix+20, iy+25], fill=accent_color, width=8)
draw.ellipse([ix-100, iy-45, ix-55, iy+5], outline=accent_color, width=8)
draw_text_center(draw, "名片管理", font_main, text_main, cx, cy + 75)
draw_text_center(draw, "搜尋・查看・匯出", font_sub, text_sub, cx, cy + 148)

# [1,1] 新增名片 — plus + card icon
cx, cy = cell_center(1, 1)
ix, iy = cx, cy - 55
draw.rounded_rectangle([ix-110, iy-70, ix+110, iy+70], radius=20, outline=accent_color, width=10)
draw.line([ix, iy-40, ix, iy+40], fill=accent_color, width=14)
draw.line([ix-40, iy, ix+40, iy], fill=accent_color, width=14)
draw_text_center(draw, "新增名片", font_main, accent_color, cx, cy + 75)
draw_text_center(draw, "單張・批量上傳", font_sub, text_sub, cx, cy + 148)

# [2,1] 團隊 — people icon
cx, cy = cell_center(2, 1)
ix, iy = cx, cy - 55
draw.ellipse([ix-95, iy-35, ix-45, iy+15], outline=text_sub, width=8)
draw.arc([ix-130, iy+30, ix-10, iy+130], start=180, end=0, fill=text_sub, width=8)
draw.ellipse([ix+45, iy-35, ix+95, iy+15], outline=text_sub, width=8)
draw.arc([ix+10, iy+30, ix+130, iy+130], start=180, end=0, fill=text_sub, width=8)
draw.ellipse([ix-40, iy-65, ix+40, iy+25], fill=bg_color, outline=accent_color, width=10)
draw.rectangle([ix-130, iy+100, ix+130, iy+180], fill=bg_color)
draw.arc([ix-90, iy+40, ix+90, iy+180], start=180, end=0, fill=accent_color, width=10)
draw_text_center(draw, "團隊", font_main, text_main, cx, cy + 75)
draw_text_center(draw, "成員・邀請・設定", font_sub, text_sub, cx, cy + 148)

# Save
output_path = os.path.join(os.path.dirname(__file__), "rich_menu_main.png")
image.save(output_path, "PNG")
print(f"Saved to {output_path}")
