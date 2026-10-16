#!/usr/bin/env python3
import math
import os
from PIL import Image, ImageDraw, ImageFont

def create_kinoflix_icon(size=512):
    # Create RGBA canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background
    corner_radius = int(size * 0.22)
    bg_box = [0, 0, size, size]
    draw.rounded_rectangle(bg_box, radius=corner_radius, fill=(20, 20, 20, 255))

    # Inner subtle glow/border
    inner_box = [int(size * 0.02), int(size * 0.02), int(size * 0.98), int(size * 0.98)]
    draw.rounded_rectangle(inner_box, radius=int(corner_radius * 0.95), outline=(255, 255, 255, 30), width=int(size * 0.015))

    # Draw vibrant Netflix-red gradient "K" ribbon
    # Left vertical stem
    stem_left = int(size * 0.22)
    stem_width = int(size * 0.16)
    stem_top = int(size * 0.2)
    stem_bottom = int(size * 0.8)

    # Shadow for depth
    shadow_offset = int(size * 0.02)
    draw.rounded_rectangle(
        [stem_left + shadow_offset, stem_top + shadow_offset, stem_left + stem_width + shadow_offset, stem_bottom + shadow_offset],
        radius=int(size * 0.03),
        fill=(0, 0, 0, 100)
    )

    # Draw Stem
    for y in range(stem_top, stem_bottom):
        ratio = (y - stem_top) / (stem_bottom - stem_top)
        # Gradient from #FF1E27 to #B20710
        r = int(229 * (1 - ratio * 0.25))
        g = int(9 * (1 - ratio * 0.4))
        b = int(20 * (1 - ratio * 0.3))
        draw.line([(stem_left, y), (stem_left + stem_width, y)], fill=(r, g, b, 255))

    # Upper diagonal arm of K
    arm_start_x = stem_left + int(stem_width * 0.7)
    arm_start_y = int(size * 0.52)
    arm_top_x = int(size * 0.78)
    arm_top_y = stem_top

    # Lower diagonal leg of K
    leg_bottom_x = int(size * 0.78)
    leg_bottom_y = stem_bottom

    # Draw arms with thick polygons
    # Upper arm
    draw.polygon([
        (arm_start_x, arm_start_y),
        (arm_top_x - int(size * 0.14), arm_top_y),
        (arm_top_x, arm_top_y),
        (arm_start_x + int(size * 0.08), arm_start_y + int(size * 0.08))
    ], fill=(245, 35, 45, 255))

    # Lower arm (foreground overlapping)
    draw.polygon([
        (arm_start_x - int(size * 0.02), arm_start_y - int(size * 0.06)),
        (leg_bottom_x - int(size * 0.14), leg_bottom_y),
        (leg_bottom_x, leg_bottom_y),
        (arm_start_x + int(size * 0.14), arm_start_y)
    ], fill=(229, 9, 20, 255))

    # Center sleek play badge
    play_cx = int(size * 0.52)
    play_cy = int(size * 0.50)
    badge_r = int(size * 0.14)

    # Circle badge
    draw.ellipse(
        [play_cx - badge_r, play_cy - badge_r, play_cx + badge_r, play_cy + badge_r],
        fill=(15, 15, 15, 240),
        outline=(255, 255, 255, 120),
        width=int(size * 0.015)
    )

    # Play triangle
    tri_len = int(badge_r * 0.8)
    tri_x = play_cx - int(tri_len * 0.35)
    tri_points = [
        (tri_x, play_cy - int(tri_len * 0.65)),
        (tri_x + tri_len, play_cy),
        (tri_x, play_cy + int(tri_len * 0.65))
    ]
    draw.polygon(tri_points, fill=(255, 255, 255, 255))

    return img

def main():
    os.makedirs("static/icons", exist_ok=True)
    
    # 512x512 Master
    img512 = create_kinoflix_icon(512)
    img512.save("static/icons/icon-512.png", "PNG")
    print("Created static/icons/icon-512.png")

    # 192x192 PWA
    img192 = img512.resize((192, 192), Image.Resampling.LANCZOS)
    img192.save("static/icons/icon-192.png", "PNG")
    print("Created static/icons/icon-192.png")

    # 180x180 Apple Touch Icon
    img180 = img512.resize((180, 180), Image.Resampling.LANCZOS)
    img180.save("static/icons/apple-touch-icon.png", "PNG")
    print("Created static/icons/apple-touch-icon.png")

    # 1024x1024 for Mac App Bundle
    img1024 = create_kinoflix_icon(1024)
    img1024.save("static/icons/icon-1024.png", "PNG")
    print("Created static/icons/icon-1024.png")

    # Windows .ICO (multi-resolution)
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img512.save("static/icons/icon.ico", format="ICO", sizes=ico_sizes)
    print("Created static/icons/icon.ico")

if __name__ == "__main__":
    main()
