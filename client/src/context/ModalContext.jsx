import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: 'info', // info, success, error, confirm
        title: '',
        message: '',
        onConfirm: null,
        onCancel: null
    });

    const showModal = useCallback(({ type = 'info', title, message, onConfirm, onCancel }) => {
        setModalConfig({
            isOpen: true,
            type,
            title,
            message,
            onConfirm,
            onCancel
        });
    }, []);

    const closeModal = useCallback(() => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = () => {
        if (modalConfig.onConfirm) modalConfig.onConfirm();
        closeModal();
    };

    const handleCancel = () => {
        if (modalConfig.onCancel) modalConfig.onCancel();
        closeModal();
    };

    return (
        <ModalContext.Provider value={{ showModal, closeModal }}>
            {children}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 ring-1 ring-black ring-opacity-5">
                        <div className="text-center">
                            {modalConfig.type === 'success' && (
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                            {modalConfig.type === 'error' && (
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                            {modalConfig.type === 'info' && (
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            )}
                            {modalConfig.type === 'confirm' && (
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                            )}

                            <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">{modalConfig.title || (modalConfig.type === 'error' ? 'Error' : modalConfig.type === 'success' ? 'Success' : 'Notice')}</h3>
                            <div className="mt-2 text-sm text-gray-500 mb-6">
                                <p>{modalConfig.message}</p>
                            </div>
                        </div>
                        <div className="mt-5 sm:mt-6 flex gap-3">
                            {modalConfig.type === 'confirm' ? (
                                <>
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
                                        onClick={handleCancel}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm"
                                        onClick={handleConfirm}
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:text-sm ${modalConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                                            modalConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                                                'bg-sky-600 hover:bg-sky-700'
                                        }`}
                                    onClick={handleConfirm}
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
};
