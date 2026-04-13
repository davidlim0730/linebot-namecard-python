"""
Tests for SaaS trial permission system (Phase 1 & 2).
Follows TDD: tests written before implementation.
"""
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# check_org_permission tests
# ---------------------------------------------------------------------------

class TestCheckOrgPermissionScan:
    """Tests for check_org_permission with action_type='scan'"""

    def _future_ts(self, days=7):
        return (datetime.now(timezone.utc) + timedelta(days=days)).strftime('%Y-%m-%dT%H:%M:%SZ')

    def _past_ts(self, days=1):
        return (datetime.now(timezone.utc) - timedelta(days=days)).strftime('%Y-%m-%dT%H:%M:%SZ')

    def test_missing_plan_type_defaults_to_pro(self):
        """Grandfathering: orgs without plan_type are treated as pro (unlimited)"""
        from app import firebase_utils
        with patch.object(firebase_utils, 'get_org', return_value={'name': 'Old Org', 'members': {}}):
            result = firebase_utils.check_org_permission('org_old', 'scan')
        assert result['allowed'] is True
        assert result['reason'] == 'ok'

    def test_pro_plan_always_allowed(self):
        """Pro orgs have no scan restrictions"""
        from app import firebase_utils
        org = {'plan_type': 'pro', 'usage': {'scan_count': 9999}}
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_pro', 'scan')
        assert result['allowed'] is True
        assert result['reason'] == 'ok'

    def test_trial_within_limit_allowed(self):
        """Trial org with time remaining and count under limit is allowed"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(3),
            'usage': {'scan_count': 10}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is True
        assert result['reason'] == 'ok'

    def test_trial_expired_blocked(self):
        """Trial org past expiry is blocked with reason trial_expired"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._past_ts(1),
            'usage': {'scan_count': 5}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is False
        assert result['reason'] == 'trial_expired'

    def test_trial_scan_count_at_limit_blocked(self):
        """Trial org at exactly 50 scans is blocked"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(3),
            'usage': {'scan_count': 50}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is False
        assert result['reason'] == 'scan_limit_reached'

    def test_trial_scan_count_over_limit_blocked(self):
        """Trial org over 50 scans is blocked"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(3),
            'usage': {'scan_count': 55}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is False
        assert result['reason'] == 'scan_limit_reached'

    def test_trial_expiry_checked_before_count(self):
        """Expired trial returns trial_expired even if count is also over limit"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._past_ts(1),
            'usage': {'scan_count': 60}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is False
        assert result['reason'] == 'trial_expired'

    def test_trial_zero_scan_count_allowed(self):
        """Brand-new trial org with 0 scans is allowed"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(7),
            'usage': {'scan_count': 0}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is True

    def test_trial_missing_usage_treated_as_zero(self):
        """Trial org without usage field is treated as 0 scans"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(7),
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'scan')
        assert result['allowed'] is True


class TestCheckOrgPermissionAddMember:
    """Tests for check_org_permission with action_type='add_member'"""

    def _future_ts(self, days=7):
        return (datetime.now(timezone.utc) + timedelta(days=days)).strftime('%Y-%m-%dT%H:%M:%SZ')

    def test_trial_under_member_limit_allowed(self):
        """Trial org with 2 members can add a third"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(7),
            'members': {'u1': {'role': 'admin'}, 'u2': {'role': 'member'}}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'add_member')
        assert result['allowed'] is True

    def test_trial_at_member_limit_blocked(self):
        """Trial org with exactly 3 members cannot add more"""
        from app import firebase_utils
        org = {
            'plan_type': 'trial',
            'trial_ends_at': self._future_ts(7),
            'members': {
                'u1': {'role': 'admin'},
                'u2': {'role': 'member'},
                'u3': {'role': 'member'}
            }
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_trial', 'add_member')
        assert result['allowed'] is False
        assert result['reason'] == 'member_limit_reached'

    def test_pro_plan_member_limit_not_applied(self):
        """Pro org with 3+ members can still add more"""
        from app import firebase_utils
        org = {
            'plan_type': 'pro',
            'members': {f'u{i}': {'role': 'member'} for i in range(10)}
        }
        with patch.object(firebase_utils, 'get_org', return_value=org):
            result = firebase_utils.check_org_permission('org_pro', 'add_member')
        assert result['allowed'] is True


# ---------------------------------------------------------------------------
# create_org trial fields tests
# ---------------------------------------------------------------------------

class TestCreateOrgTrialFields:
    """Tests that create_org writes plan_type, trial_ends_at, and usage"""

    def test_create_org_writes_trial_plan_type(self):
        """New org must have plan_type='trial'"""
        from app import firebase_utils
        written_data = {}

        mock_ref = MagicMock()
        mock_ref.set.side_effect = lambda data: written_data.update(
            data if isinstance(data, dict) else {}
        )
        mock_ref.key = 'org_test123'

        with patch('app.firebase_utils.db') as mock_db:
            mock_db.reference.return_value = mock_ref
            firebase_utils.create_org('user_abc', 'Test Org')

        # Find the org set call (the one with name field)
        org_set_calls = [
            c for c in mock_ref.set.call_args_list
            if isinstance(c.args[0], dict) and 'name' in c.args[0]
        ]
        assert len(org_set_calls) == 1
        org_data = org_set_calls[0].args[0]
        assert org_data.get('plan_type') == 'trial'

    def test_create_org_writes_trial_ends_at_approx_7_days(self):
        """New org trial_ends_at should be approximately 7 days from now"""
        from app import firebase_utils

        mock_ref = MagicMock()
        with patch('app.firebase_utils.db') as mock_db:
            mock_db.reference.return_value = mock_ref
            firebase_utils.create_org('user_abc', 'Test Org')

        org_set_calls = [
            c for c in mock_ref.set.call_args_list
            if isinstance(c.args[0], dict) and 'name' in c.args[0]
        ]
        org_data = org_set_calls[0].args[0]
        trial_ends_at = org_data.get('trial_ends_at')
        assert trial_ends_at is not None

        ends_dt = datetime.fromisoformat(trial_ends_at.replace('Z', '+00:00'))
        diff = ends_dt - datetime.now(timezone.utc)
        # Should be between 6.9 and 7.1 days from now
        assert timedelta(days=6, hours=21) < diff < timedelta(days=7, hours=1)

    def test_create_org_writes_usage_scan_count_zero(self):
        """New org must start with usage.scan_count = 0"""
        from app import firebase_utils

        mock_ref = MagicMock()
        with patch('app.firebase_utils.db') as mock_db:
            mock_db.reference.return_value = mock_ref
            firebase_utils.create_org('user_abc', 'Test Org')

        org_set_calls = [
            c for c in mock_ref.set.call_args_list
            if isinstance(c.args[0], dict) and 'name' in c.args[0]
        ]
        org_data = org_set_calls[0].args[0]
        assert org_data.get('usage', {}).get('scan_count') == 0


# ---------------------------------------------------------------------------
# ensure_user_org returns (org_id, is_new) tests
# ---------------------------------------------------------------------------

class TestEnsureUserOrgReturnsIsNew:
    """Tests that ensure_user_org returns (org_id, is_new: bool)"""

    def test_returns_existing_org_with_is_new_false(self):
        """Existing user returns (org_id, False)"""
        from app import firebase_utils
        with patch.object(firebase_utils, 'get_user_org_id', return_value='org_existing'):
            result = firebase_utils.ensure_user_org('user_abc')
        assert result == ('org_existing', False)

    def test_returns_new_org_with_is_new_true(self):
        """New user gets org created and returns (org_id, True)"""
        from app import firebase_utils
        with patch.object(firebase_utils, 'get_user_org_id', return_value=None), \
             patch.object(firebase_utils, 'create_org', return_value='org_new123') as mock_create:
            result = firebase_utils.ensure_user_org('user_new')
        assert result == ('org_new123', True)
        mock_create.assert_called_once()
