function CategoryFilter({ categories, selected, onSelect }) {
  return (
    <div className="category-filter">
      <button
        type="button"
        className={`chip ${!selected ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={`chip ${selected === category.slug ? 'active' : ''}`}
          onClick={() => onSelect(category.slug)}
        >
          {category.name}
        </button>
      ))}
    </div>
  )
}

export default CategoryFilter
