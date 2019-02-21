import crypto from 'crypto'
import { ITimestampedDocument } from '../models/util'

export function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function uuid() {
	return crypto.randomBytes(16).toString('base64')
}

export function byDateDesc(a: ITimestampedDocument, b: ITimestampedDocument) {
	return +new Date(b.createdAt) - +new Date(a.createdAt)
}

export function getId({ id }: { id: string }) {
	return id
}

export function rangedArray(length: number) {
	const array = []

	for (let i = 0; i < length; ++i) {
		array.push(i)
	}

	return array
}

export function filterValues(object: object) {
	return Object.entries(object)
		.filter(([_, value]) => value !== null && value !== void 0)
		.group(([key, value]) => [key, value])
}