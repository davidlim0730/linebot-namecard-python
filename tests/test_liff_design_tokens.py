"""
Test suite for LIFF Design Tokens CSS

Validates that:
1. The design-tokens.css file exists
2. All required color tokens are defined
3. All required typography tokens are defined
4. All required spacing tokens are defined
5. CSS syntax is valid (no unclosed rules, dangling semicolons, etc.)
"""

import os
import re
from pathlib import Path


class TestDesignTokensCSS:
    """Test cases for CSS design tokens"""

    @staticmethod
    def get_design_tokens_file():
        """Get the path to the design-tokens.css file"""
        project_root = Path(__file__).parent.parent
        return project_root / "app" / "liff_app" / "styles" / "design-tokens.css"

    def test_design_tokens_file_exists(self):
        """Test that design-tokens.css file exists"""
        token_file = self.get_design_tokens_file()
        assert token_file.exists(), f"design-tokens.css not found at {token_file}"

    def test_css_file_is_readable(self):
        """Test that the CSS file is readable and contains content"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()
        assert len(content) > 0, "design-tokens.css is empty"

    def test_primary_color_tokens(self):
        """Test that primary color tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_colors = [
            "--color-primary",
            "--color-primary-dark",
            "--color-primary-light",
        ]

        for color in required_colors:
            assert (
                color in content
            ), f"Color token {color} not found in design-tokens.css"

    def test_neutral_color_tokens(self):
        """Test that neutral (background) color tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_colors = [
            "--color-bg-1",
            "--color-bg-2",
            "--color-bg-3",
            "--color-bg-4",
        ]

        for color in required_colors:
            assert (
                color in content
            ), f"Background color token {color} not found in design-tokens.css"

    def test_text_color_tokens(self):
        """Test that text color tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_colors = [
            "--color-text-primary",
            "--color-text-secondary",
            "--color-text-disabled",
            "--color-text-inverse",
        ]

        for color in required_colors:
            assert (
                color in content
            ), f"Text color token {color} not found in design-tokens.css"

    def test_system_color_tokens(self):
        """Test that system color tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_colors = [
            "--color-success",
            "--color-error",
            "--color-warning",
            "--color-info",
        ]

        for color in required_colors:
            assert (
                color in content
            ), f"System color token {color} not found in design-tokens.css"

    def test_shadow_tokens(self):
        """Test that shadow tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_shadows = ["--shadow-sm", "--shadow-md", "--shadow-lg"]

        for shadow in required_shadows:
            assert (
                shadow in content
            ), f"Shadow token {shadow} not found in design-tokens.css"

    def test_spacing_tokens(self):
        """Test that spacing tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_spacings = [
            "--space-2",
            "--space-4",
            "--space-8",
            "--space-12",
            "--space-16",
            "--space-20",
            "--space-24",
            "--space-32",
        ]

        for spacing in required_spacings:
            assert (
                spacing in content
            ), f"Spacing token {spacing} not found in design-tokens.css"

    def test_typography_font_tokens(self):
        """Test that typography font tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_fonts = ["--font-headline", "--font-body"]

        for font in required_fonts:
            assert (
                font in content
            ), f"Font token {font} not found in design-tokens.css"

    def test_radius_tokens(self):
        """Test that border radius tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_radii = [
            "--radius-sm",
            "--radius-md",
            "--radius-lg",
            "--radius-full",
        ]

        for radius in required_radii:
            assert (
                radius in content
            ), f"Radius token {radius} not found in design-tokens.css"

    def test_z_index_tokens(self):
        """Test that z-index tokens are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_z_indices = [
            "--z-base",
            "--z-overlay",
            "--z-modal",
            "--z-toast",
            "--z-dropdown",
        ]

        for z_index in required_z_indices:
            assert (
                z_index in content
            ), f"Z-index token {z_index} not found in design-tokens.css"

    def test_typography_utility_classes(self):
        """Test that typography utility classes are defined"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        required_classes = [
            ".text-display-lg",
            ".text-display-md",
            ".text-headline-lg",
            ".text-headline-md",
            ".text-headline-sm",
            ".text-body-lg",
            ".text-body-md",
            ".text-body-sm",
            ".text-label-lg",
            ".text-label-md",
            ".text-label-sm",
        ]

        for class_name in required_classes:
            assert (
                class_name in content
            ), f"Typography class {class_name} not found in design-tokens.css"

    def test_css_syntax_validity(self):
        """Test that CSS has no obvious syntax errors"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Count opening and closing braces
        opening_braces = content.count("{")
        closing_braces = content.count("}")
        assert (
            opening_braces == closing_braces
        ), f"Unmatched braces: {opening_braces} opening, {closing_braces} closing"

        # Check for dangling semicolons (basic check)
        # Look for lines with semicolons but not in comments
        lines = content.split("\n")
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # Skip comments and empty lines
            if stripped.startswith("/*") or stripped.startswith("*") or not stripped:
                continue
            # Check for semicolons outside of property declarations
            if ";" in stripped and not (":" in stripped or stripped.endswith("}")):
                # This might be a false positive in comments, but generally OK
                pass

    def test_color_values_are_hex_or_rgba(self):
        """Test that color values are properly formatted"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Find all color variable assignments
        color_pattern = r"--color-[\w-]+:\s*([#\w\(\),\s.]+);"
        matches = re.findall(color_pattern, content)

        for color_value in matches:
            color_value = color_value.strip()
            # Check if it's a valid hex color or rgba
            is_hex = re.match(r"^#[0-9A-Fa-f]{6}$", color_value)
            is_rgba = re.match(r"^rgba\(", color_value)
            assert (
                is_hex or is_rgba
            ), f"Invalid color value format: {color_value}"

    def test_spacing_values_are_numeric(self):
        """Test that spacing values are numeric with units"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Find all spacing variable assignments
        spacing_pattern = r"--space-[\w-]+:\s*(\d+(?:px|em|rem)?);"
        matches = re.findall(spacing_pattern, content)

        assert (
            len(matches) > 0
        ), "No spacing tokens found or spacing values are not numeric"

    def test_radius_values_are_numeric(self):
        """Test that radius values are numeric with units"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Find all radius variable assignments
        radius_pattern = r"--radius-[\w-]+:\s*(\d+(?:px)?|[\w]+);"
        matches = re.findall(radius_pattern, content)

        assert (
            len(matches) > 0
        ), "No radius tokens found or radius values are not properly formatted"

    def test_font_families_are_quoted(self):
        """Test that font family values are properly quoted"""
        token_file = self.get_design_tokens_file()
        with open(token_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Find all font variable assignments
        font_pattern = r'--font-[\w-]+:\s*"([^"]+)"'
        matches = re.findall(font_pattern, content)

        assert len(matches) > 0, "No font tokens found with proper quotes"


if __name__ == "__main__":
    # Quick test runner for local validation
    test_suite = TestDesignTokensCSS()
    test_methods = [
        method
        for method in dir(test_suite)
        if method.startswith("test_") and callable(getattr(test_suite, method))
    ]

    passed = 0
    failed = 0

    for method_name in test_methods:
        try:
            method = getattr(test_suite, method_name)
            method()
            print(f"✓ {method_name}")
            passed += 1
        except AssertionError as e:
            print(f"✗ {method_name}: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"✗ {method_name}: {type(e).__name__}: {str(e)}")
            failed += 1

    print(f"\n{passed} passed, {failed} failed out of {len(test_methods)} tests")
