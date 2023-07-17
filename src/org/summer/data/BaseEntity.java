package org.summer.data;

import fr.cblades.domain.Board;

import javax.persistence.*;

@MappedSuperclass
public class BaseEntity implements RelationshipOwnerSeawave {

	@Id @GeneratedValue
	long id;
	@Version
	long version;
	long updateTimestamp;
	
	public long getId() {
		return this.id;
	}
	
	public long getVersion() {
		return this.version;
	}
	
	public BaseEntity setVersion(long version) {
		if (this.version!=0 && version!=this.version) {
			throw new OptimisticLockException(this);
		}
		return this;
	}

	public long getUpdateTimestamp() {
		return this.updateTimestamp;
	}

	@PrePersist @PreUpdate
	void updateTimestamp() {
		this.updateTimestamp = System.currentTimeMillis();
	}

}
