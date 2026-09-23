package com.smartbus.util;

import javax.servlet.http.Part;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Tiện ích upload ảnh đính kèm cho phản ánh/khiếu nại
 */
public class FileUploadUtil {

    private static final long MAX_SIZE = 5 * 1024 * 1024; // 5MB
    private static final String[] ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"};

    /**
     * Lưu file upload vào thư mục uploads và trả về tên file đã lưu
     *
     * @param part       Part từ multipart request
     * @param uploadDir  Đường dẫn tuyệt đối đến thư mục uploads
     * @return tên file đã lưu (relative path), hoặc null nếu không có file
     */
    public static String saveFile(Part part, String uploadDir) throws IOException {
        if (part == null || part.getSize() == 0) return null;
        if (!isValidImage(part)) {
            throw new IllegalArgumentException("Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP) tối đa 5MB.");
        }

        // Tạo thư mục nếu chưa có
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();

        String originalName = Paths.get(part.getSubmittedFileName()).getFileName().toString();
        String ext          = getExtension(originalName);
        String savedName    = UUID.randomUUID().toString() + "." + ext;

        try (InputStream is = part.getInputStream()) {
            Files.copy(is, Paths.get(uploadDir, savedName), StandardCopyOption.REPLACE_EXISTING);
        }
        return savedName;
    }

    private static boolean isValidImage(Part part) {
        if (part.getSize() > MAX_SIZE) return false;
        String contentType = part.getContentType();
        if (contentType == null) return false;
        for (String allowed : ALLOWED_TYPES) {
            if (contentType.equalsIgnoreCase(allowed)) return true;
        }
        return false;
    }

    private static String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return (dot >= 0) ? filename.substring(dot + 1).toLowerCase() : "jpg";
    }
}
