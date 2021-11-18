package org.summer;

public class Ref<T> {

	T value;
	
	public Ref() {
		value=null;
	}
	
	public Ref(T value) {
		this.value = value;
	}
	
	public T get() {
		return value;
	}
	
	public Ref<T> set(T value) {
		this.value = value;
		return this;
	}
}
