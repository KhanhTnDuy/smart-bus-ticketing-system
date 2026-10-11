import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { fetchBlob } from '../../api/client';

/**
 * Hiển thị giấy tờ cá nhân tải từ /api/uploads. Tệp cần đăng nhập mới đọc được nên không dùng được thẻ img
 * trỏ thẳng vào URL: phải tải bằng mã đăng nhập rồi dựng đường dẫn tạm trong trình duyệt.
 */
export const ProtectedDocument: React.FC<{ url: string }> = ({ url }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    const controller = new AbortController();
    setObjectUrl(null);
    setError(null);
    fetchBlob(url, controller.signal)
      .then((blob) => {
        revoked = URL.createObjectURL(blob);
        setIsPdf(blob.type === 'application/pdf');
        setObjectUrl(revoked);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Không tải được giấy tờ.');
      });
    return () => {
      controller.abort();
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [url]);

  if (error) return <div className="text-xs text-rose-600">Không xem được giấy tờ: {error}</div>;
  if (!objectUrl) return <div className="text-xs text-slate-400">Đang tải giấy tờ...</div>;
  if (isPdf) {
    return (
      <a href={objectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-institutional-600 dark:text-sky-400 hover:underline">
        <ExternalLink className="w-3.5 h-3.5" /> Mở tệp PDF
      </a>
    );
  }
  return <img src={objectUrl} alt="Giấy tờ minh chứng" className="max-h-72 rounded-lg border border-slate-200 dark:border-slate-700 object-contain" />;
};
