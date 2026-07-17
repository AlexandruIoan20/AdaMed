package ro.platformamedicala.dto;

import java.util.List;

public class PageDTO<T> {
    public List<T> content;
    public int page;
    public int size;
    public long totalElements;
    public int totalPages;

    public static <T> PageDTO<T> of(List<T> content, int page, int size, long totalElements) {
        PageDTO<T> dto = new PageDTO<>();
        dto.content = content;
        dto.page = page;
        dto.size = size;
        dto.totalElements = totalElements;
        dto.totalPages = size <= 0 ? 0 : (int) Math.ceil((double) totalElements / size);
        return dto;
    }
}
