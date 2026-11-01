// src/components/style-guide/icon.ts
const ICON_PATH = '/image/icons';

export interface IconProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const Icons: Record<string, IconProps> = {
  calendar: { src: `${ICON_PATH}/calendar.svg`, alt: 'Calendar', width: 24, height: 24 },
  call: { src: `${ICON_PATH}/call.svg`, alt: 'Call', width: 24, height: 24 },
  camera: { src: `${ICON_PATH}/camera.svg`, alt: 'Camera', width: 24, height: 24 },
  cartButton: { src: `${ICON_PATH}/cart-button.svg`, alt: 'Cart Button', width: 50, height: 28 },
  edit: { src: `${ICON_PATH}/edit.svg`, alt: 'Edit', width: 24, height: 24 },
  facebook: { src: `${ICON_PATH}/facebook.svg`, alt: 'Facebook', width: 24, height: 24 },
  fastDelivery: {
    src: `${ICON_PATH}/fast-delivery.svg`,
    alt: 'Fast Delivery',
    width: 24,
    height: 24,
  },
  heartLine: { src: `${ICON_PATH}/heart-line.svg`, alt: 'Heart Line', width: 24, height: 24 },
  instagram: { src: `${ICON_PATH}/instagram.svg`, alt: 'Instagram', width: 24, height: 24 },
  location: { src: `${ICON_PATH}/location.svg`, alt: 'Location', width: 64, height: 64 },
  lock01: { src: `${ICON_PATH}/lock-01.svg`, alt: 'Lock', width: 24, height: 24 },
  mail: { src: `${ICON_PATH}/mail.svg`, alt: 'Mail', width: 24, height: 24 },
  money: { src: `${ICON_PATH}/money.svg`, alt: 'Money', width: 24, height: 24 },
  search02: { src: `${ICON_PATH}/search-02.svg`, alt: 'Search', width: 24, height: 24 },
  shoppingBag: { src: `${ICON_PATH}/shopping-bag.svg`, alt: 'Shopping Bag', width: 24, height: 24 },
  store01: { src: `${ICON_PATH}/store-01.svg`, alt: 'Store', width: 24, height: 24 },
  ticketPercent: {
    src: `${ICON_PATH}/ticket-percent.svg`,
    alt: 'Ticket Percent',
    width: 24,
    height: 24,
  },
  userCircle1: {
    src: `${ICON_PATH}/user-circle-1.svg`,
    alt: 'User Circle 1',
    width: 24,
    height: 24,
  },
  userCircle: { src: `${ICON_PATH}/user-circle.svg`, alt: 'User Circle', width: 24, height: 24 },
  youtube: { src: `${ICON_PATH}/youtube.svg`, alt: 'Youtube', width: 24, height: 24 },
};
