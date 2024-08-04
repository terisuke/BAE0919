import Image from 'next/image';

import { IconButton } from '@/components/iconButton';
import homeStore from '@/features/stores/home';

const ModalImage = () => {
  const modalImage = homeStore((s) => s.modalImage);

  if (!modalImage) return null;

  return (
    <div className="row-span-1 flex justify-end max-h-[40vh]">
      <div className="relative w-full md:max-w-[512px] max-w-[50%] m-16">
        <Image
          src={modalImage}
          width={512}
          height={512}
          alt="Modal Image"
          className="rounded-8 w-auto object-contain max-h-[100%] ml-auto"
        />
        <div className="absolute top-4 right-4">
          <IconButton
            iconName="24/Trash"
            className="hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled m-8"
            isProcessing={false}
            onClick={() => homeStore.setState({ modalImage: '' })}
          />
        </div>
      </div>
    </div>
  );
};
export default ModalImage;
