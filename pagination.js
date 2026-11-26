export function getPaginationItems(currentPage, totalPages, maxButtons = 5) {
  const total = Math.max(1, Math.floor(totalPages));
  const current = Math.min(total, Math.max(1, Math.floor(currentPage)));
  const siblings = Math.max(0, Math.floor((maxButtons - 1) / 2));

  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  let start = Math.max(1, current - siblings);
  let end = Math.min(total, current + siblings);
  const windowSize = siblings * 2 + 1;
  if (end - start + 1 < windowSize) {
    if (start === 1) end = Math.min(total, start + windowSize - 1);
    else if (end === total) start = Math.max(1, end - windowSize + 1);
  }

  const visible = new Set([1, total]);
  for (let page = start; page <= end; page++) visible.add(page);
  const numbers = [...visible].sort((a, b) => a - b);
  const items = [];
  for (let index = 0; index < numbers.length; index++) {
    const number = numbers[index];
    if (index > 0) {
      const previous = numbers[index - 1];
      if (number - previous > 1) items.push("ellipsis");
    }
    items.push(number);
  }
  return items;
}
