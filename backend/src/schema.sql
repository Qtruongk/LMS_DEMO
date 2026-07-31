DROP TABLE IF EXISTS submissions, tests, materials, notifications, sessions, tuitions, enrollments, classes, users CASCADE;
DROP TYPE IF EXISTS user_role, class_status, session_status, test_type, publish_status, tuition_status, notification_priority;

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE class_status AS ENUM ('upcoming', 'active', 'completed', 'archived');
CREATE TYPE session_status AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE test_type AS ENUM ('quiz', 'test', 'assignment');
CREATE TYPE publish_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE tuition_status AS ENUM ('unpaid', 'partial', 'paid', 'waived');
CREATE TYPE notification_priority AS ENUM ('normal', 'important', 'urgent');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  username TEXT UNIQUE NOT NULL,
  phone TEXT,
  student_code TEXT UNIQUE,
  role user_role NOT NULL,
  password TEXT NOT NULL,
  specialty TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  teacher_id INTEGER REFERENCES users(id),
  start_date DATE,
  end_date DATE,
  status class_status NOT NULL DEFAULT 'upcoming',
  schedule TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  internal_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enrollments (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learning_status TEXT NOT NULL DEFAULT 'dang_hoc',
  attendance_rate INTEGER NOT NULL DEFAULT 100,
  progress INTEGER NOT NULL DEFAULT 0,
  teacher_note TEXT,
  UNIQUE(class_id, student_id)
);

CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status session_status NOT NULL DEFAULT 'not_started',
  teacher_notes TEXT,
  completed_at TIMESTAMPTZ
);

CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  external_link TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  visibility TEXT NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tests (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type test_type NOT NULL,
  due_date TIMESTAMPTZ,
  max_score NUMERIC(5,2) NOT NULL DEFAULT 10,
  status publish_status NOT NULL DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  score NUMERIC(5,2),
  feedback TEXT,
  graded_by INTEGER REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  UNIQUE(test_id, student_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  target_role VARCHAR(20) DEFAULT 'all',
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  receiver_type TEXT NOT NULL DEFAULT 'all',
  receiver_ids INTEGER[] DEFAULT '{}',
  priority notification_priority NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_status JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE tuitions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status tuition_status NOT NULL DEFAULT 'unpaid',
  paid_at DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

CREATE TABLE feedbacks (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (full_name, username, phone, student_code, role, password, specialty, note) VALUES
('Quản trị VAT', 'admin', '0900000000', NULL, 'admin', 'admin123', 'Quản trị đào tạo', 'Tài khoản quản trị mặc định');

INSERT INTO notifications (title, content, type, target_role, sender_id, created_by, receiver_type, receiver_ids, priority, created_at)
SELECT item.title, item.content, item.type, 'all', admin_user.id, admin_user.id, 'all', '{}', item.priority::notification_priority, now() - (item.position || ' hours')::interval
FROM (VALUES
  (1, 'Nhắc chuẩn bị bài trước buổi học', 'Học viên vui lòng xem lại nội dung buổi trước, ghi chú câu hỏi thắc mắc và chuẩn bị tài liệu cần thiết trước khi vào lớp.', 'class', 'important'),
  (2, 'Cập nhật lịch học bù tuần này', 'Lớp sẽ có lịch học bù theo thông báo của giảng viên. Vui lòng kiểm tra lịch trong mục lớp học và phản hồi nếu trùng lịch cá nhân.', 'class', 'urgent'),
  (3, 'Yêu cầu nộp bài tập cuối chương', 'Các em hoàn thành bài tập cuối chương và nộp đúng hạn để giảng viên kịp nhận xét trước buổi ôn tập.', 'class', 'important'),
  (4, 'Tài liệu mới đã được đăng', 'Bộ tài liệu ôn tập và câu hỏi luyện tập đã được cập nhật. Học viên nên tải về và học theo thứ tự gợi ý.', 'general', 'normal'),
  (5, 'Nhắc quy định điểm danh', 'Vui lòng vào lớp đúng giờ, điểm danh đầu buổi và báo trước cho giảng viên nếu cần nghỉ học.', 'general', 'important'),
  (6, 'Thông báo kiểm tra nhanh đầu giờ', 'Buổi học tới sẽ có phần kiểm tra nhanh 10 phút để đánh giá mức độ nắm bài. Nội dung nằm trong phần đã học gần nhất.', 'class', 'urgent'),
  (7, 'Cập nhật kênh hỗ trợ học viên', 'Mọi thắc mắc về bài học, lịch học hoặc tài liệu, học viên gửi phản hồi qua hệ thống để được xử lý tập trung.', 'general', 'normal'),
  (8, 'Nhắc hoàn thành khảo sát sau buổi học', 'Sau mỗi buổi học, học viên vui lòng hoàn thành khảo sát ngắn để trung tâm cải thiện chất lượng giảng dạy.', 'general', 'normal'),
  (9, 'Chuẩn bị nội dung thảo luận nhóm', 'Mỗi nhóm chuẩn bị phần trình bày ngắn về chủ đề đã phân công. Giảng viên sẽ gọi ngẫu nhiên trong buổi học.', 'class', 'important'),
  (10, 'Thông báo bảo trì hệ thống học tập', 'Hệ thống có thể gián đoạn ngắn trong khung giờ bảo trì. Vui lòng lưu bài làm trước khi thao tác.', 'general', 'urgent')
) AS item(position, title, content, type, priority)
CROSS JOIN LATERAL (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1) admin_user;
