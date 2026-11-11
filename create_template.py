import os
import sys
import docx
import logging
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

logging.basicConfig(filename='/root/lms_demo/error.log', level=logging.ERROR, format='%(asctime)s %(levelname)s: %(message)s')
def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    logging.error("Lỗi xảy ra:", exc_info=(exc_type, exc_value, exc_traceback))
sys.excepthook = handle_exception

doc = docx.Document()

# Title
title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title_p.add_run('TÀI LIỆU CÂU HỎI MẪU - NGÂN HÀNG ĐỀ VAT LMS')
run.font.size = Pt(16)
run.font.bold = True
run.font.color.rgb = RGBColor(115, 22, 29)

sub_p = doc.add_paragraph()
sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub_run = sub_p.add_run('Hệ thống tự động nhận diện 5 loại câu hỏi: Trắc nghiệm 1 đáp án, nhiều đáp án, đúng/sai, điền khuyết, tự luận')
sub_run.font.size = Pt(10)
sub_run.font.italic = True

doc.add_paragraph('─' * 50)

# Section 1
doc.add_paragraph('PHẦN 1: CÂU HỎI TRẮC NGHIỆM 1 ĐÁP ÁN')

p1 = doc.add_paragraph()
p1.add_run('Câu 1: In her leisure time, Lan often ______ her friends to ask about homework and weekend plans.\n'
           'A. messages\n'
           'B. folds\n'
           'C. balances\n'
           'D. trains\n'
           'Giải thích: message = nhắn tin cho ai.\n'
           'Loại câu hỏi: 1 đáp án\n'
           'Thời gian làm: 1 phút\n'
           'Đáp án: A')

p2 = doc.add_paragraph()
p2.add_run('Câu 2: Minh is very ______ on doing DIY projects and often makes things from recycled materials.\n'
           'A. cruel\n'
           'B. keen\n'
           'C. weird\n'
           'D. satisfied\n'
           'Giải thích: be keen on = rất thích, say mê.\n'
           'Loại câu hỏi: 1 đáp án\n'
           'Thời gian làm: 1 phút\n'
           'Đáp án: B')

out_dir = '/root/lms_demo/frontend/public'
os.makedirs(out_dir, exist_ok=True)
doc.save(os.path.join(out_dir, 'Mau_cau_hoi_ngan_hang_VAT_LMS.docx'))
print('SUCCESS')

