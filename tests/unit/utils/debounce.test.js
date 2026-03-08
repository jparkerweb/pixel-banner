import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounceFunction, debounceImmediate, debounceAndSwallow } from '@/utils/debounce.js';

describe('debounce utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('debounceFunction', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 1000);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(999);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should reset timer on multiple calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(500);
      
      debouncedFn(); // Reset timer
      vi.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should pass arguments to the debounced function', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 100);

      debouncedFn('arg1', 'arg2', 42);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 42);
    });

    it('should use the arguments from the last call', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('should handle zero delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 0);

      debouncedFn();
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should handle multiple separate calls after delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 100);

      debouncedFn('first');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);

      debouncedFn('second');
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should clear previous timeout when called again', () => {
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('debounceImmediate', () => {
    it('should execute immediately on first call', () => {
      const fn = vi.fn();
      const debouncedFn = debounceImmediate(fn, 1000);

      debouncedFn('immediate');
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('immediate');
    });

    it('should not execute on subsequent calls before wait time', () => {
      const fn = vi.fn();
      const debouncedFn = debounceImmediate(fn, 1000);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');
      
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('first');
    });

    it('should execute again after wait time has passed', () => {
      const fn = vi.fn();
      const debouncedFn = debounceImmediate(fn, 1000);

      debouncedFn('first');
      expect(fn).toHaveBeenCalledTimes(1);

      // Make a second call to trigger the timeout behavior
      debouncedFn('second');
      expect(fn).toHaveBeenCalledTimes(1); // Still only the immediate call

      // After timeout, the delayed call should execute
      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should reset first call flag after timeout', () => {
      const fn = vi.fn();
      const debouncedFn = debounceImmediate(fn, 1000);

      debouncedFn('first');
      expect(fn).toHaveBeenCalledTimes(1);

      // Trigger a second call to start the timeout
      debouncedFn('delayed');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(2);

      // Should be immediate again after timeout reset the flag
      debouncedFn('second');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenLastCalledWith('second');
    });

    it('should reset timer on multiple calls and execute with last arguments', () => {
      const fn = vi.fn();
      const debouncedFn = debounceImmediate(fn, 1000);

      debouncedFn('first');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(500);
      debouncedFn('second');
      debouncedFn('third');
      
      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1); // Still just the immediate call

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('third');
    });

    it('should handle zero delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounceImmediate(fn, 0);

      debouncedFn('immediate');
      expect(fn).toHaveBeenCalledOnce();

      // Trigger second call to activate timeout behavior
      debouncedFn('delayed');
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should maintain separate state for different debounced functions', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debouncedFn1 = debounceImmediate(fn1, 1000);
      const debouncedFn2 = debounceImmediate(fn2, 1000);

      debouncedFn1('fn1');
      debouncedFn2('fn2');

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });
  });

  describe('debounceAndSwallow', () => {
    beforeEach(() => {
      // Use real timers for Date.now() tests
      vi.useRealTimers();
      vi.spyOn(Date, 'now');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('should execute immediately on first call', () => {
      Date.now.mockReturnValue(1000);
      
      const fn = vi.fn().mockReturnValue('result');
      const debouncedFn = debounceAndSwallow(fn, 1000);

      const result = debouncedFn('arg');
      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('arg');
      expect(result).toBe('result');
    });

    it('should swallow calls within wait period', () => {
      Date.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1500)
        .mockReturnValueOnce(1999);
      
      const fn = vi.fn().mockReturnValue('result');
      const debouncedFn = debounceAndSwallow(fn, 1000);

      const result1 = debouncedFn('first');
      const result2 = debouncedFn('second');
      const result3 = debouncedFn('third');

      expect(fn).toHaveBeenCalledOnce();
      expect(result1).toBe('result');
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
    });

    it('should allow execution after wait period', () => {
      Date.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000);
      
      const fn = vi.fn()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second');
      const debouncedFn = debounceAndSwallow(fn, 1000);

      const result1 = debouncedFn('first');
      const result2 = debouncedFn('second');

      expect(fn).toHaveBeenCalledTimes(2);
      expect(result1).toBe('first');
      expect(result2).toBe('second');
    });

    it('should handle exact boundary case', () => {
      Date.now
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000); // Exactly 1000ms later
      
      const fn = vi.fn()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second');
      const debouncedFn = debounceAndSwallow(fn, 1000);

      const result1 = debouncedFn('first');
      const result2 = debouncedFn('second');

      expect(fn).toHaveBeenCalledTimes(2);
      expect(result1).toBe('first');
      expect(result2).toBe('second');
    });

    it('should handle zero delay', () => {
      Date.now.mockReturnValue(1000);
      
      const fn = vi.fn().mockReturnValue('result');
      const debouncedFn = debounceAndSwallow(fn, 0);

      const result1 = debouncedFn('first');
      const result2 = debouncedFn('second');

      expect(fn).toHaveBeenCalledTimes(2);
      expect(result1).toBe('result');
      expect(result2).toBe('result');
    });

    it('should track time correctly across multiple executions', () => {
      Date.now
        .mockReturnValueOnce(1000) // First call
        .mockReturnValueOnce(1500) // Swallowed
        .mockReturnValueOnce(2000) // Allowed
        .mockReturnValueOnce(2500) // Swallowed
        .mockReturnValueOnce(3000); // Allowed
      
      const fn = vi.fn().mockReturnValue('result');
      const debouncedFn = debounceAndSwallow(fn, 1000);

      debouncedFn('call1');
      debouncedFn('call2');
      debouncedFn('call3');
      debouncedFn('call4');
      debouncedFn('call5');

      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenNthCalledWith(1, 'call1');
      expect(fn).toHaveBeenNthCalledWith(2, 'call3');
      expect(fn).toHaveBeenNthCalledWith(3, 'call5');
    });

    it('should maintain separate timing for different debounced functions', () => {
      Date.now.mockReturnValue(1000);
      
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      const debouncedFn1 = debounceAndSwallow(fn1, 1000);
      const debouncedFn2 = debounceAndSwallow(fn2, 1000);

      debouncedFn1('fn1');
      debouncedFn2('fn2');

      expect(fn1).toHaveBeenCalledOnce();
      expect(fn2).toHaveBeenCalledOnce();
    });

    it('should return function result when executed', () => {
      Date.now.mockReturnValue(1000);
      
      const fn = vi.fn()
        .mockReturnValueOnce({ success: true })
        .mockReturnValueOnce(42)
        .mockReturnValueOnce('string result');
      
      const debouncedFn = debounceAndSwallow(fn, 0);

      expect(debouncedFn()).toEqual({ success: true });
      expect(debouncedFn()).toBe(42);
      expect(debouncedFn()).toBe('string result');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle function that throws an error', () => {
      vi.useFakeTimers();
      
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const debouncedFn = debounceFunction(fn, 100);

      debouncedFn();
      
      expect(() => {
        vi.advanceTimersByTime(100);
      }).toThrow('Test error');
    });

    it('should handle null or undefined arguments', () => {
      vi.useFakeTimers();
      
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 100);

      debouncedFn(null, undefined);
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith(null, undefined);
    });

    it('should handle very large wait times', () => {
      vi.useFakeTimers();
      
      const fn = vi.fn();
      const debouncedFn = debounceFunction(fn, 999999999); // Use a large but not max value

      debouncedFn();
      vi.advanceTimersByTime(1000000);
      expect(fn).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });
});