import fitz
from pathlib import Path
pdf = Path('attached_assets/Guide_Web_Push_Muzan_Service_Complet_1787588320899.pdf')
out = Path('.agents/outputs/push-guide-complete-pages')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(pdf)
print('pages', doc.page_count)
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    path = out / f'page-{i+1}.png'
    pix.save(path)
    print(path)
