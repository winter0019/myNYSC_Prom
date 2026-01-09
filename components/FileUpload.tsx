/// <reference lib="dom" />
import React, { useCallback, useState, useRef } from 'react';
import { UploadIcon, CheckCircleIcon } from './IconComponents';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);


  const handleFile = useCallback((file: File | undefined | null) => {
    if (file) {
      setFileName(file.name);
      setLiveMessage(`Selected file: ${file.name}.`);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };
  
  const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    // Fix: Access files from dataTransfer using type assertion to handle missing property errors.
    const dataTransfer = e.dataTransfer as any;
    if (!disabled && dataTransfer.files && dataTransfer.files.length > 0) {
      handleFile(dataTransfer.files[0]);
      dataTransfer.clearData();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Use type assertion on target to access the files property.
    const target = e.target as any;
    if (target.files && target.files.length > 0) {
      handleFile(target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Fix: Use type assertion to call the click method which may not be recognized on HTMLInputElement.
      (inputRef.current as any)?.click();
    }
  };

  return (
    <div className="w-full">
        <label htmlFor="dropzone-file" className="block mb-2 text-sm font-medium text-light-text dark:text-gray-300">
            2. Upload Document
        </label>
      <label 
        onDragEnter={onDragEnter}
        onDragOver={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-describedby="file-upload-description"
        className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors duration-300 ${
          disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-slate-800/50 opacity-60' : 'cursor-pointer'
        } ${
          isDragging 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
          : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            {fileName ? (
                <>
                    <CheckCircleIcon className="w-10 h-10 mb-3 text-green-500"/>
                    <p className="mb-2 text-sm font-semibold text-light-text dark:text-dark-text">{fileName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">File selected successfully.</p>
                </>
            ) : (
                <>
                    <UploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">Click to upload</span> or drag and drop
                    </p>
                    <p id="file-upload-description" className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG, or TXT files</p>
                </>
            )}
        </div>
        <input ref={inputRef} id="dropzone-file" type="file" className="hidden" onChange={onChange} disabled={disabled} accept=".pdf,.png,.jpg,.jpeg,.txt,.md,text/plain,image/png,image/jpeg,application/pdf" />
      </label>
      <div className="sr-only" aria-live="polite" role="status">
        {liveMessage}
      </div>
    </div>
  );
};