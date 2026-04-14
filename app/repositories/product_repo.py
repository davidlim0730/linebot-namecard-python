from firebase_admin import db
from .. import config
from ..models.product import Product
from typing import Optional, Dict, List


class ProductRepo:
    """Repository for Product records"""

    PRODUCTS_PATH = "products"

    def get(self, org_id: str, product_id: str) -> Optional[Product]:
        """Get a single product"""
        ref = db.reference(f"{self.PRODUCTS_PATH}/{org_id}/{product_id}")
        data = ref.get()
        if not data:
            return None
        return self._to_product(product_id, data)

    def list_all(self, org_id: str) -> Dict[str, Product]:
        """List all products in an organization"""
        ref = db.reference(f"{self.PRODUCTS_PATH}/{org_id}")
        data = ref.get() or {}
        return {
            product_id: self._to_product(product_id, product_data)
            for product_id, product_data in data.items()
            if isinstance(product_data, dict)
        }

    def list_active(self, org_id: str) -> List[Product]:
        """List all active products"""
        all_products = self.list_all(org_id)
        return [
            product for product in all_products.values()
            if product.status == "Active"
        ]

    def list_by_status(self, org_id: str, status: str) -> List[Product]:
        """List products by status"""
        all_products = self.list_all(org_id)
        return [
            product for product in all_products.values()
            if product.status == status
        ]

    def save(self, org_id: str, product_id: str, product_data: dict) -> bool:
        """Create or overwrite a product"""
        try:
            db.reference(f"{self.PRODUCTS_PATH}/{org_id}/{product_id}").set(product_data)
            return True
        except Exception:
            return False

    def update(self, org_id: str, product_id: str, fields: dict) -> bool:
        """Update specific fields of a product"""
        try:
            db.reference(f"{self.PRODUCTS_PATH}/{org_id}/{product_id}").update(fields)
            return True
        except Exception:
            return False

    def delete(self, org_id: str, product_id: str) -> bool:
        """Delete a product"""
        try:
            db.reference(f"{self.PRODUCTS_PATH}/{org_id}/{product_id}").delete()
            return True
        except Exception:
            return False

    def _to_product(self, product_id: str, data: dict) -> Product:
        """Convert Firebase dict to Product model"""
        d = dict(data)
        allowed = {"org_id", "name", "status", "description", "created_at"}
        filtered = {k: v for k, v in d.items() if k in allowed}
        return Product(id=product_id, **filtered)
