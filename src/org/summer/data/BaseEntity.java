package org.summer.data;

import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.MappedSuperclass;
import javax.persistence.OptimisticLockException;
import javax.persistence.Version;

@MappedSuperclass
public class BaseEntity implements RelationshipOwnerSeawave {

	@Id @GeneratedValue
	long id;
	@Version
	long version;
	
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
}
