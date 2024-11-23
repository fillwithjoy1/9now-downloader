import unittest

import main


class TestPythonMethods(unittest.TestCase):
    def test_key_fetching(self):
        self.assertEqual(main.get_decryption_keys(
            "AAAAW3Bzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAADsIARIQ62dqu8s0Xpa7z2FmMPGj2hoNd2lkZXZpbmVfdGVzdCIQZmtqM2xqYVNkZmFsa3IzaioCSEQyAA==",
            "https://cwip-shaka-proxy.appspot.com/no_auth"),
                         """ccbf5fb4c2965be7aa130ffb3ba9fd73:9cc0c92044cb1d69433f5f5839a159df
9bf0e9cf0d7b55aeb4b289a63bab8610:90f52fd8ca48717b21d0c2fed7a12ae1
eb676abbcb345e96bbcf616630f1a3da:100b6c20940f779a4589152b57d2dacb
0294b9599d755de2bbf0fdca3fa5eab7:3bda2f40344c7def614227b9c0f03e26
639da80cf23b55f3b8cab3f64cfa5df6:229f5f29b643e203004b30c4eaf348f4
""")


class CheckIllegalCharacters(unittest.TestCase):
    def test_one(self):
        self.assertEqual(main.sanitize_file_string("Test | Vertical Bar"), "Test - Vertical Bar")

    def test_two(self):
        self.assertEqual(main.sanitize_file_string("Test -> Next"), "Test -- Next")
