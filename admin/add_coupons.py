import glob
import re
import os

directory = os.path.join(os.path.dirname(__file__), '*.html')
files = glob.glob(directory)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # If file doesn't have coupons link and HAS a customers link
    if 'href="coupons"' not in content and 'href="customers"' in content:
        # We find the customers link and append the coupons link after it
        new_content = re.sub(
            r'(<a class="nav-link".*?href="customers".*?</a>)',
            r'\1\n                    <a class="nav-link" href="coupons"><i class="fas fa-ticket-alt me-2"></i> <span class="nav-text">Coupons</span></a>',
            content
        )
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"Updated: {os.path.basename(file)}")
