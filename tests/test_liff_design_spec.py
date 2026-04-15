"""
LIFF Frontend Design Specification Acceptance Tests

Verifies that the frontend implementation matches design specification:
- Design tokens (colors, spacing, typography, border-radius)
- Component structure and layout
- Responsive design (LIFF viewport)
- Primary flow completeness
"""

import pytest
import re
from pathlib import Path


class TestDesignTokens:
    """驗證 design-tokens.css 中的設計令牌"""

    @pytest.fixture
    def design_tokens_content(self):
        """Load design-tokens.css content"""
        project_root = Path(__file__).parent.parent
        css_path = project_root / "app" / "liff_app" / "styles" / "design-tokens.css"
        assert css_path.exists(), f"Missing {css_path}"
        return css_path.read_text()

    def test_primary_color_defined(self, design_tokens_content):
        """Verify --color-primary is defined as #06C755 (LINE Green)"""
        assert '--color-primary' in design_tokens_content
        # Extract value
        match = re.search(r'--color-primary:\s*([^;]+);', design_tokens_content)
        assert match, "Could not find --color-primary value"
        value = match.group(1).strip()
        assert '#06C755' in value or '#06c755' in value or 'rgb(6, 199, 85)' in value

    def test_color_palette_complete(self, design_tokens_content):
        """Verify color palette includes primary, secondary, error, success, warning, info"""
        required_colors = [
            '--color-primary',
            '--color-error',
            '--color-success',
            '--color-warning',
            '--color-info'
        ]
        for color in required_colors:
            assert color in design_tokens_content, f"Missing {color}"

    def test_spacing_scale_defined(self, design_tokens_content):
        """Verify spacing scale from --space-2 to --space-32 (2px to 32px)"""
        spacing_pattern = r'--space-\d+:\s*(\d+)px;'
        matches = re.findall(spacing_pattern, design_tokens_content)
        assert len(matches) >= 8, "Spacing scale incomplete"

        # Verify specific spacing values
        assert '--space-2: 2px' in design_tokens_content
        assert '--space-8: 8px' in design_tokens_content
        assert '--space-16: 16px' in design_tokens_content
        assert '--space-32: 32px' in design_tokens_content

    def test_typography_scale_defined(self, design_tokens_content):
        """Verify typography hierarchy defined"""
        required_fonts = [
            '--font-headline',
            '--font-body'
        ]
        for font in required_fonts:
            assert font in design_tokens_content, f"Missing {font}"

    def test_border_radius_scale(self, design_tokens_content):
        """Verify border-radius tokens"""
        required_radius = [
            '--radius-sm',
            '--radius-md',
            '--radius-lg',
            '--radius-full'
        ]
        for radius in required_radius:
            assert radius in design_tokens_content, f"Missing {radius}"

    def test_shadow_tokens_defined(self, design_tokens_content):
        """Verify shadow tokens for depth"""
        assert '--shadow-sm' in design_tokens_content
        assert '--shadow-md' in design_tokens_content
        assert '--shadow-lg' in design_tokens_content

    def test_z_index_scale(self, design_tokens_content):
        """Verify z-index tokens for layering"""
        required_z_indices = [
            '--z-base',
            '--z-overlay',
            '--z-modal',
            '--z-toast',
            '--z-dropdown'
        ]
        for z_index in required_z_indices:
            assert z_index in design_tokens_content, f"Missing {z_index}"

    def test_border_radius_lg_is_16px(self, design_tokens_content):
        """Verify card border-radius is 16px (from design spec)"""
        match = re.search(r'--radius-lg:\s*([^;]+);', design_tokens_content)
        assert match, "Could not find --radius-lg"
        value = match.group(1).strip()
        assert '16px' in value

    def test_typography_classes_hierarchy(self, design_tokens_content):
        """Verify typography utility classes exist for hierarchy"""
        required_classes = [
            '.text-display-lg',
            '.text-display-md',
            '.text-headline-lg',
            '.text-headline-md',
            '.text-headline-sm',
            '.text-body-lg',
            '.text-body-md',
            '.text-body-sm',
            '.text-label-lg',
            '.text-label-md',
            '.text-label-sm'
        ]
        for class_name in required_classes:
            assert class_name in design_tokens_content, f"Missing {class_name}"


class TestComponentStructure:
    """驗證前端組件結構和佈局"""

    @pytest.fixture
    def liff_app_index(self):
        """Load LIFF app index.html"""
        project_root = Path(__file__).parent.parent
        index_path = project_root / "app" / "liff_app" / "index.html"
        assert index_path.exists(), f"Missing {index_path}"
        return index_path.read_text()

    def test_css_files_linked(self, liff_app_index):
        """Verify all CSS files are linked in HTML"""
        required_css = [
            'design-tokens.css',
            'layout.css',
            'animations.css'
        ]
        for css in required_css:
            assert css in liff_app_index, f"Missing CSS link: {css}"

    def test_bottom_nav_height_56px(self):
        """Verify bottom navigation is 56px height"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Should define .bottom-nav with height: 56px
        assert '.bottom-nav' in layout_css
        assert 'height: 56px' in layout_css or 'height:56px' in layout_css

    def test_liff_content_scrollable(self):
        """Verify .liff-content has flex:1 and overflow-y:auto"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        assert '.liff-content' in layout_css
        assert 'flex: 1' in layout_css or 'flex:1' in layout_css
        assert 'overflow-y: auto' in layout_css or 'overflow-y:auto' in layout_css

    def test_no_hardcoded_colors_in_layout(self):
        """Verify no excessive hardcoded colors in layout.css"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Count hardcoded hex colors (excluding var() references)
        # Look for #XXXXXX not in var(...)
        hardcoded = re.findall(r'(?<!var\(--)#[0-9a-fA-F]{6}(?![0-9a-fA-F])', layout_css)
        # Allow up to 2 hardcoded colors (some fallbacks are acceptable)
        assert len(hardcoded) <= 2, f"Too many hardcoded colors: {hardcoded}"

    def test_layout_uses_css_variables(self):
        """Verify layout.css uses CSS variables for styling"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Verify usage of var(--color-*) or var(--space-*) etc.
        assert 'var(--' in layout_css, "layout.css does not use CSS variables"
        assert 'var(--color-' in layout_css, "layout.css does not use color variables"
        assert 'var(--space-' in layout_css, "layout.css does not use spacing variables"

    def test_animations_uses_css_variables(self):
        """Verify animations.css uses CSS variables"""
        project_root = Path(__file__).parent.parent
        animations_css = (project_root / "app" / "liff_app" / "styles" / "animations.css").read_text()

        assert 'var(--' in animations_css, "animations.css does not use CSS variables"

    def test_fab_button_positioning(self):
        """Verify FAB is positioned 64px from bottom (above bottom nav 56px + 8px gap)"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Should define .fab with bottom: 64px
        assert '.fab' in layout_css
        assert 'bottom: 64px' in layout_css or 'bottom:64px' in layout_css


class TestResponsiveDesign:
    """驗證響應式設計適應 LIFF 視窗"""

    def test_liff_viewport_layout(self):
        """Verify layout handles LIFF viewport (100vh height)"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Should have root/body height management
        assert 'height: 100vh' in layout_css or 'height: 100%' in layout_css

    def test_bottom_nav_fixed_positioning(self):
        """Verify bottom nav is position: fixed"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Find .bottom-nav section
        bottom_nav_start = layout_css.find('.bottom-nav {')
        bottom_nav_end = layout_css.find('}', bottom_nav_start)
        bottom_nav_section = layout_css[bottom_nav_start:bottom_nav_end]

        assert 'position: fixed' in bottom_nav_section

    def test_liff_content_padding_bottom(self):
        """Verify .liff-content has padding-bottom for nav space"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        # Should have padding-bottom to account for fixed nav
        assert 'padding-bottom' in layout_css
        # Should be at least 56px (nav height)
        match = re.search(r'\.liff-content\s*\{[^}]*padding-bottom:\s*(\d+)px', layout_css)
        if match:
            padding = int(match.group(1))
            assert padding >= 56, f"padding-bottom too small: {padding}px"

    def test_animation_gpu_accelerated(self):
        """Verify animations use GPU-accelerated properties (transform, opacity)"""
        project_root = Path(__file__).parent.parent
        animations_css = (project_root / "app" / "liff_app" / "styles" / "animations.css").read_text()

        # Should use transform and opacity
        assert 'transform' in animations_css
        assert 'opacity' in animations_css

        # Verify keyframes use transform (not top/left/right which trigger reflow)
        assert '@keyframes' in animations_css
        assert 'transform: translate' in animations_css


class TestPrimaryFlow:
    """驗證 Primary Flow 完整性"""

    def test_pages_exist(self):
        """Verify all required pages exist"""
        project_root = Path(__file__).parent.parent
        required_pages = [
            'app/liff_app/views/CardList.js',
            'app/liff_app/views/CardDetail.js',
            'app/liff_app/views/CardEdit.js'
        ]
        for page in required_pages:
            page_path = project_root / page
            assert page_path.exists(), f"Missing {page_path}"

    def test_cardlist_has_search(self):
        """Verify CardList supports search"""
        project_root = Path(__file__).parent.parent
        content = (project_root / "app" / "liff_app" / "views" / "CardList.js").read_text()
        assert 'searchQuery' in content or 'search' in content.lower()
        # Should have input element for search
        assert 'input' in content.lower()

    def test_cardlist_has_tag_filtering(self):
        """Verify CardList supports tag filtering"""
        project_root = Path(__file__).parent.parent
        content = (project_root / "app" / "liff_app" / "views" / "CardList.js").read_text()
        assert 'tag' in content.lower()
        assert 'selectedTag' in content or 'filter' in content.lower()

    def test_carddetail_exists(self):
        """Verify CardDetail page exists and has content"""
        project_root = Path(__file__).parent.parent
        content = (project_root / "app" / "liff_app" / "views" / "CardDetail.js").read_text()
        assert len(content) > 0
        # Should have name, title, company at minimum
        assert 'name' in content.lower() or 'card' in content.lower()

    def test_cardedit_exists(self):
        """Verify CardEdit page exists and has form structure"""
        project_root = Path(__file__).parent.parent
        content = (project_root / "app" / "liff_app" / "views" / "CardEdit.js").read_text()
        assert len(content) > 0
        # Should be an edit/form component
        assert 'edit' in content.lower() or 'form' in content.lower()

    def test_toast_integration(self):
        """Verify Toast component exists"""
        project_root = Path(__file__).parent.parent
        toast_path = project_root / "app" / "liff_app" / "components" / "Toast.js"
        assert toast_path.exists(), "Missing Toast component"

        content = toast_path.read_text()
        assert len(content) > 0

    def test_bottom_nav_integration(self):
        """Verify BottomNav component exists"""
        project_root = Path(__file__).parent.parent
        nav_path = project_root / "app" / "liff_app" / "components" / "BottomNav.js"
        assert nav_path.exists(), "Missing BottomNav component"

        content = nav_path.read_text()
        assert len(content) > 0

    def test_app_js_exists(self):
        """Verify main app.js exists"""
        project_root = Path(__file__).parent.parent
        app_path = project_root / "app" / "liff_app" / "app.js"
        assert app_path.exists(), "Missing app.js"

        content = app_path.read_text()
        assert len(content) > 0


class TestAccessibilityBasics:
    """基本可訪問性檢查"""

    def test_index_has_lang_attribute(self):
        """Verify HTML has language attribute"""
        project_root = Path(__file__).parent.parent
        index_path = project_root / "app" / "liff_app" / "index.html"
        content = index_path.read_text()

        assert 'lang=' in content, "HTML should have lang attribute"
        assert 'zh-TW' in content or 'zh' in content or 'en' in content

    def test_index_has_meta_charset(self):
        """Verify HTML has charset meta tag"""
        project_root = Path(__file__).parent.parent
        index_path = project_root / "app" / "liff_app" / "index.html"
        content = index_path.read_text()

        assert 'charset' in content.lower(), "HTML should have charset meta tag"

    def test_index_has_meta_viewport(self):
        """Verify HTML has viewport meta tag for mobile"""
        project_root = Path(__file__).parent.parent
        index_path = project_root / "app" / "liff_app" / "index.html"
        content = index_path.read_text()

        assert 'viewport' in content, "HTML should have viewport meta tag"

    def test_index_has_title(self):
        """Verify HTML has title tag"""
        project_root = Path(__file__).parent.parent
        index_path = project_root / "app" / "liff_app" / "index.html"
        content = index_path.read_text()

        assert '<title>' in content, "HTML should have title tag"

    def test_index_has_root_app_element(self):
        """Verify HTML has #app root element"""
        project_root = Path(__file__).parent.parent
        index_path = project_root / "app" / "liff_app" / "index.html"
        content = index_path.read_text()

        assert 'id="app"' in content or "id='app'" in content


class TestDesignSystemConsistency:
    """驗證設計系統在各組件的一致性應用"""

    def test_layout_css_defines_page_container(self):
        """Verify .page-container class is defined for page layout"""
        project_root = Path(__file__).parent.parent
        layout_css = (project_root / "app" / "liff_app" / "styles" / "layout.css").read_text()

        assert '.page-container' in layout_css
        assert 'padding' in layout_css or 'margin' in layout_css

    def test_animations_css_has_toast_animations(self):
        """Verify toast entrance/exit animations are defined"""
        project_root = Path(__file__).parent.parent
        animations_css = (project_root / "app" / "liff_app" / "styles" / "animations.css").read_text()

        assert '@keyframes' in animations_css
        assert 'slideDown' in animations_css or 'fade' in animations_css

    def test_animations_css_has_skeleton_loader(self):
        """Verify skeleton loading animation is defined"""
        project_root = Path(__file__).parent.parent
        animations_css = (project_root / "app" / "liff_app" / "styles" / "animations.css").read_text()

        assert '.skeleton-loader' in animations_css or 'skeleton' in animations_css

    def test_design_tokens_has_glassmorphism_styles(self):
        """Verify glassmorphism or backdrop-filter styles exist in animations"""
        project_root = Path(__file__).parent.parent
        animations_css = (project_root / "app" / "liff_app" / "styles" / "animations.css").read_text()

        # Glassmorphism is implemented via backdrop-filter
        assert 'backdrop-filter' in animations_css or 'glassmorphism' in animations_css.lower()


class TestColorTokenValues:
    """驗證色彩令牌的實際值符合規格"""

    def test_primary_color_is_line_green(self):
        """Verify primary color is LINE Green #06C755"""
        project_root = Path(__file__).parent.parent
        css_path = project_root / "app" / "liff_app" / "styles" / "design-tokens.css"
        content = css_path.read_text()

        match = re.search(r'--color-primary:\s*#([0-9A-Fa-f]{6})', content)
        assert match, "Primary color should be in hex format"
        color_value = match.group(1).upper()
        assert color_value == '06C755', f"Primary color should be #06C755, got #{color_value}"

    def test_error_color_is_red(self):
        """Verify error color is red"""
        project_root = Path(__file__).parent.parent
        css_path = project_root / "app" / "liff_app" / "styles" / "design-tokens.css"
        content = css_path.read_text()

        assert '--color-error' in content
        # Error should be reddish (#EF4444 or similar)
        match = re.search(r'--color-error:\s*#([0-9A-Fa-f]{6})', content)
        if match:
            hex_value = match.group(1)
            # Red channel should be high (EF = 239)
            red_channel = hex_value[:2]
            assert int(red_channel, 16) > 200, f"Error color red channel too low: {hex_value}"

    def test_success_color_is_green(self):
        """Verify success color is green"""
        project_root = Path(__file__).parent.parent
        css_path = project_root / "app" / "liff_app" / "styles" / "design-tokens.css"
        content = css_path.read_text()

        assert '--color-success' in content
        # Success should be greenish
        match = re.search(r'--color-success:\s*#([0-9A-Fa-f]{6})', content)
        if match:
            hex_value = match.group(1)
            # Green channel should be highest
            r, g, b = int(hex_value[0:2], 16), int(hex_value[2:4], 16), int(hex_value[4:6], 16)
            assert g > r and g > b, f"Success color should be greenish: #{hex_value}"
