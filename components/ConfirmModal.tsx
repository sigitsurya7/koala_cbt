"use client";

import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

type ConfirmModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  confirmColor?: "primary" | "danger" | "default" | "secondary" | "success" | "warning";
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmModal({
  isOpen,
  onOpenChange,
  title = "Konfirmasi",
  description,
  confirmLabel = "Hapus",
  confirmColor = "danger",
  onConfirm,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {() => (
          <>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>{description && <p className="text-sm opacity-80">{description}</p>}</ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button color={confirmColor} onPress={async () => { await onConfirm(); onOpenChange(false); }}>
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

