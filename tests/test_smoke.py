import json
import os
import unittest
from urllib.error import URLError
from urllib.request import urlopen


BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8000").rstrip("/")


class ApplicationSmokeTests(unittest.TestCase):
    def get(self, path: str) -> tuple[bytes, str]:
        try:
            with urlopen(f"{BASE_URL}{path}", timeout=10) as response:
                return response.read(), response.headers.get_content_type()
        except URLError as error:
            self.fail(f"Application is not reachable at {BASE_URL}: {error}")

    def test_health_endpoint(self) -> None:
        body, content_type = self.get("/api/health")
        self.assertEqual(content_type, "application/json")
        self.assertEqual(json.loads(body), {
            "status": "ok",
            "service": "backend",
            "version": "5.4.1",
        })

    def test_frontend_contains_map_and_order_workflow(self) -> None:
        body, content_type = self.get("/")
        page = body.decode("utf-8")
        self.assertEqual(content_type, "text/html")
        self.assertIn('id="map"', page)
        self.assertIn('id="pedido-form"', page)
        self.assertIn('id="return-to-start"', page)
        self.assertIn("Creado Por el Ing. Andrès Camacho", page)
        self.assertNotIn("Estado del backend", page)
        self.assertIn('id="dashboard"', page)
        self.assertIn('id="destination-mode"', page)
        self.assertIn('id="settings-view"', page)

    def test_frontend_assets_are_served(self) -> None:
        for path, expected_type in (
            ("/static/app.js", "text/javascript"),
            ("/static/styles.css", "text/css"),
            ("/static/v3.js", "text/javascript"),
            ("/static/v53.js", "text/javascript"),
            ("/static/route-audit-v534.js", "text/javascript"),
            ("/static/route-checklist-v541.js", "text/javascript"),
        ):
            _, content_type = self.get(path)
            self.assertEqual(content_type, expected_type)


if __name__ == "__main__":
    unittest.main()
