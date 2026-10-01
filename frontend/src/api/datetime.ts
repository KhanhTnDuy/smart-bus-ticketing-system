/**
 * Xử lý mốc thời gian trả về từ backend.
 *
 * EF đọc cột datetime của MySQL ra với DateTimeKind.Unspecified, nên chuỗi JSON
 * không kèm hậu tố "Z" dù giá trị được ghi bằng DateTime.UtcNow. Nếu đưa thẳng
 * vào `new Date(...)` thì trình duyệt hiểu là giờ địa phương và lệch đúng bằng
 * chênh lệch múi giờ (với Việt Nam là 7 tiếng).
 */

/** Đọc chuỗi thời gian của backend theo đúng nghĩa UTC. */
export const parseUtc = (value: string): Date => {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Hiển thị theo giờ địa phương, dạng DD/MM/YYYY HH:mm. */
export const formatDateTime = (value: string): string => {
  const date = parseUtc(value);
  if (Number.isNaN(date.getTime())) return '';
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

/** Hiển thị theo giờ địa phương, chỉ phần ngày, dạng DD/MM/YYYY. */
export const formatDate = (value: string): string => {
  const date = parseUtc(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
