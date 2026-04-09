from PIL import Image, ImageDraw, ImageFont
import os

# Create image
width = 2500
height = 843
bg_color = "#1E1E1E" # Dark background
accent_color = "#06C755" # LINE Green
text_main = "#FFFFFF"
text_sub = "#A0A0A0"
line_color = "#333333"

image = Image.new("RGB", (width, height), bg_color)
draw = ImageDraw.Draw(image)

# Draw separators (optional, very subtle)
draw.line([(833, 200), (833, height - 200)], fill=line_color, width=4)
draw.line([(1666, 200), (1666, height - 200)], fill=line_color, width=4)

# Load font (macOS)
try:
    font_main = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 76, index=0) # PingFang TC Regular
    font_sub = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 44, index=0)
except IOError:
    try:
        font_main = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 76)
        font_sub = ImageFont.truetype("/Library/Fonts/Arial Unicode.ttf", 44)
    except IOError:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()

def draw_text_center(d, text, font, fill, x, y):
    if hasattr(font, 'getbbox'):
        bbox = font.getbbox(text)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
    elif hasattr(font, 'getsize'):
        tw, th = font.getsize(text)
    else:
        tw, th = 100, 20
        
    d.text((x - tw/2, y - th/2), text, font=font, fill=fill)

# Column 1
cx = 833 / 2
# Icon: Card
ix, iy = cx, 320
draw.rounded_rectangle([ix - 140, iy - 90, ix + 140, iy + 90], radius=24, outline=accent_color, width=12)
draw.line([ix - 90, iy - 30, ix + 90, iy - 30], fill=accent_color, width=10)
draw.line([ix - 90, iy + 30, ix + 30, iy + 30], fill=accent_color, width=10)
draw.ellipse([ix - 110, iy - 50, ix - 60, iy], outline=accent_color, width=10)

draw_text_center(draw, "名片操作", font_main, text_main, cx, 560)
draw_text_center(draw, "新增・搜尋・管理", font_sub, text_sub, cx, 680)

# Column 2
cx = 833 + 833 / 2
# Icon: People
ix, iy = cx, 320
# Person 2 (Left back)
draw.ellipse([ix - 120, iy - 40, ix - 60, iy + 20], outline=text_sub, width=10)
draw.arc([ix - 160, iy + 40, ix - 20, iy + 140], start=180, end=0, fill=text_sub, width=10)
# Person 3 (Right back)
draw.ellipse([ix + 60, iy - 40, ix + 120, iy + 20], outline=text_sub, width=10)
draw.arc([ix + 20, iy + 40, ix + 160, iy + 140], start=180, end=0, fill=text_sub, width=10)
# Person 1 (Center Front)
# Draw an opaque background for the center person so it covers the ones behind
draw.ellipse([ix - 50, iy - 80, ix + 50, iy + 20], fill=bg_color, outline=accent_color, width=12)
draw.pieslice([ix - 100, iy + 40, ix + 100, iy + 180], start=180, end=360, fill=bg_color, outline=accent_color, width=12)
# Re-draw the arc to make sure there are no bottom borders inside the pie slice
draw.rectangle([ix - 110, iy + 110, ix + 110, iy + 190], fill=bg_color)
draw.arc([ix - 100, iy + 40, ix + 100, iy + 180], start=180, end=0, fill=accent_color, width=12)

draw_text_center(draw, "團隊功能", font_main, text_main, cx, 560)
draw_text_center(draw, "成員・邀請・資訊", font_sub, text_sub, cx, 680)

# Column 3
cx = 1666 + 834 / 2
# Icon: Chart & Settings
ix, iy = cx, 320
# Bar chart
draw.rectangle([ix - 80, iy + 10, ix - 40, iy + 90], outline=accent_color, width=10)
draw.rectangle([ix - 20, iy - 40, ix + 20, iy + 90], outline=accent_color, width=10)
draw.rectangle([ix + 40, iy - 80, ix + 80, iy + 90], outline=accent_color, width=10)
# Bottom line
draw.line([ix - 110, iy + 100, ix + 110, iy + 100], fill=accent_color, width=12)

draw_text_center(draw, "資料與設定", font_main, text_main, cx, 560)
draw_text_center(draw, "匯出・Sheets 同步", font_sub, text_sub, cx, 680)

# Save image
output_path = "/Users/davidlin/Claude-Code-Project/linebot-namecard-python/assets/rich_menu_main.png"
image.save(output_path, "PNG")
print(f"Saved to {output_path}")
