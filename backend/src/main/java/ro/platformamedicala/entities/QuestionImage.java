package ro.platformamedicala.entities;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "question_images")
public class QuestionImage extends PanacheEntityBase {

    @Id
    public UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    public Question question;

    @Column(name = "image_key", nullable = false, length = 500)
    public String imageKey;

    @Column(name = "image_url", nullable = false, length = 1000)
    public String imageUrl;

    @Column(name = "display_order", nullable = false)
    public Integer displayOrder = 0;

    @Column(name = "created_at", nullable = false)
    public Instant createdAt;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}